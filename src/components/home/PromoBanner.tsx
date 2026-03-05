"use client";

import Image from "next/image";
import Link from "next/link";

export interface BannerData {
  id: string;
  name: string;
  position: string;
  imageDesktop: string;
  imageMobile?: string | null;
  link?: string | null;
  altText?: string | null;
}

interface PromoBannerProps {
  banners: BannerData[];
}

export function PromoBanner({ banners }: PromoBannerProps) {
  if (!banners || banners.length === 0) return null;

  return (
    <section className="mx-auto max-w-[1440px] px-4 py-4 lg:px-8">
      <div className="flex flex-col gap-4">
        {banners.map((banner) => {
          const content = (
            <div className="relative w-full overflow-hidden rounded-lg">
              {/* Desktop image */}
              <div className="hidden md:block">
                <Image
                  src={banner.imageDesktop}
                  alt={banner.altText || banner.name}
                  width={1400}
                  height={400}
                  className="w-full h-auto object-cover"
                  sizes="(max-width: 1440px) 100vw, 1400px"
                />
              </div>
              {/* Mobile image */}
              <div className="block md:hidden">
                <Image
                  src={banner.imageMobile || banner.imageDesktop}
                  alt={banner.altText || banner.name}
                  width={768}
                  height={400}
                  className="w-full h-auto object-cover"
                  sizes="100vw"
                />
              </div>
            </div>
          );

          if (banner.link) {
            return (
              <Link
                key={banner.id}
                href={banner.link}
                className="block transition-opacity hover:opacity-95"
              >
                {content}
              </Link>
            );
          }

          return <div key={banner.id}>{content}</div>;
        })}
      </div>
    </section>
  );
}
