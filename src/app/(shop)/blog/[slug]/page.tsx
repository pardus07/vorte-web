import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { ArrowLeft, Calendar, User, Tag } from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await db.blogPost.findUnique({
    where: { slug, published: true },
    select: { title: true, seoTitle: true, seoDescription: true, excerpt: true, coverImage: true },
  });

  if (!post) return { title: "Yazı Bulunamadı" };

  return {
    title: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt || undefined,
    openGraph: {
      title: post.seoTitle || post.title,
      description: post.seoDescription || post.excerpt || undefined,
      images: post.coverImage ? [post.coverImage] : undefined,
    },
    alternates: { canonical: `/blog/${slug}` },
  };
}

export default async function BlogDetailPage({ params }: Props) {
  const { slug } = await params;

  const post = await db.blogPost.findUnique({
    where: { slug, published: true },
  });

  if (!post) notFound();

  // JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt || post.seoDescription || "",
    image: post.coverImage || undefined,
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: {
      "@type": "Person",
      name: post.authorName,
    },
    publisher: {
      "@type": "Organization",
      name: "Vorte Tekstil",
      logo: {
        "@type": "ImageObject",
        url: "https://www.vorte.com.tr/logo.png",
      },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article className="mx-auto max-w-3xl px-4 py-12">
        {/* Back link */}
        <Link
          href="/blog"
          className="mb-6 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600"
        >
          <ArrowLeft className="h-4 w-4" /> Blog&apos;a Dön
        </Link>

        {/* Cover image */}
        {post.coverImage && (
          <div
            className="mb-8 h-64 rounded-lg bg-cover bg-center md:h-96"
            style={{ backgroundImage: `url(${post.coverImage})` }}
          />
        )}

        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 md:text-4xl">{post.title}</h1>

        {/* Meta */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-400">
          <span className="flex items-center gap-1">
            <User className="h-4 w-4" /> {post.authorName}
          </span>
          {post.publishedAt && (
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {new Date(post.publishedAt).toLocaleDateString("tr-TR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          )}
        </div>

        {/* Tags */}
        {post.tags && (
          <div className="mt-4 flex flex-wrap gap-2">
            {post.tags.split(",").map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                <Tag className="h-3 w-3" /> {tag.trim()}
              </span>
            ))}
          </div>
        )}

        {/* Excerpt */}
        {post.excerpt && (
          <p className="mt-6 text-lg text-gray-600 italic border-l-4 border-[#7AC143] pl-4">
            {post.excerpt}
          </p>
        )}

        {/* Content */}
        <div
          className="prose prose-gray mt-8 max-w-none prose-headings:text-gray-900 prose-a:text-[#7AC143] prose-img:rounded-lg"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Back to blog */}
        <div className="mt-12 border-t pt-6">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#7AC143] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Tüm Yazıları Gör
          </Link>
        </div>
      </article>
    </>
  );
}
