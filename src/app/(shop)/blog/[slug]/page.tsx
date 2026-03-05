import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import Image from "next/image";
import { ArrowLeft, Calendar, User, Tag, AlertTriangle, BookOpen } from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await db.blogPost.findUnique({
    where: { slug },
    select: { title: true, seoTitle: true, seoDescription: true, excerpt: true, coverImage: true, published: true },
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
    // Taslak yazıları indexleme
    ...(post.published ? {} : { robots: { index: false, follow: false } }),
  };
}

export default async function BlogDetailPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { preview } = await searchParams;
  const isPreview = preview === "1";

  let post;

  if (isPreview) {
    // Admin preview modu: auth kontrol et
    const session = await auth();
    const role = (session?.user as unknown as { role?: string })?.role;
    const isAdmin = role === "ADMIN" || role === "EDITOR";

    if (isAdmin) {
      // Admin/Editor ise yayınlanmamış yazıyı da göster
      post = await db.blogPost.findUnique({ where: { slug } });
    } else {
      // Admin değilse sadece yayınlanmış
      post = await db.blogPost.findUnique({ where: { slug, published: true } });
    }
  } else {
    // Normal mod: sadece yayınlanmış
    post = await db.blogPost.findUnique({ where: { slug, published: true } });
  }

  if (!post) notFound();

  // JSON-LD (sadece yayınlanmış yazılar için)
  const jsonLd = post.published
    ? {
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
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <article className="mx-auto max-w-3xl px-4 py-12">
        {/* Preview Banner */}
        {isPreview && !post.published && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>
              <strong>Önizleme Modu</strong> — Bu yazı henüz yayınlanmamış.
              Sadece admin kullanıcılar görebilir.
            </span>
          </div>
        )}

        {/* Back link */}
        <Link
          href="/blog"
          className="mb-6 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600"
        >
          <ArrowLeft className="h-4 w-4" /> Blog&apos;a Dön
        </Link>

        {/* Cover image */}
        {post.coverImage ? (
          <div className="relative mb-8 h-64 overflow-hidden rounded-lg md:h-96">
            <Image
              src={post.coverImage}
              alt={post.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 800px"
              priority
            />
          </div>
        ) : (
          <div className="mb-8 flex h-64 items-center justify-center rounded-lg bg-gray-50 md:h-96">
            <BookOpen className="h-16 w-16 text-gray-300" />
          </div>
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
