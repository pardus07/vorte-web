"use client";

import { useEffect, useState } from "react";
import {
  Image,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Info,
  CheckCircle,
  XCircle,
  Layout,
  CalendarDays,
  Link2,
  Monitor,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface BannerData {
  id: string;
  name: string;
  position: string;
  imageDesktop: string;
  imageMobile: string | null;
  link: string | null;
  altText: string | null;
  active: boolean;
  sortOrder: number;
  startDate: string | null;
  endDate: string | null;
}

const POSITIONS = [
  { value: "homepage-top", label: "Ana Sayfa - Ust" },
  { value: "homepage-mid", label: "Ana Sayfa - Orta" },
  { value: "homepage-bottom", label: "Ana Sayfa - Alt" },
  { value: "category-top", label: "Kategori Sayfasi - Ust" },
  { value: "product-sidebar", label: "Urun Sayfasi - Kenar" },
  { value: "checkout", label: "Odeme Sayfasi" },
];

const emptyBanner = {
  name: "",
  position: "homepage-top",
  imageDesktop: "",
  imageMobile: null as string | null,
  link: null as string | null,
  altText: null as string | null,
  active: true,
  sortOrder: 0,
  startDate: null as string | null,
  endDate: null as string | null,
};

export default function AdminBannerPage() {
  const [banners, setBanners] = useState<BannerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<
    BannerData | (typeof emptyBanner & { id?: string }) | null
  >(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filterPosition, setFilterPosition] = useState("");

  const fetchBanners = async () => {
    const res = await fetch("/api/admin/banners");
    const data = await res.json();
    setBanners(data.banners || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.name || !editing.imageDesktop) {
      setError("Ad ve desktop gorseli zorunludur");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const isNew = !("id" in editing) || !editing.id;
      const url = isNew
        ? "/api/admin/banners"
        : `/api/admin/banners/${editing.id}`;
      const method = isNew ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });

      if (res.ok) {
        setEditing(null);
        setSuccess(isNew ? "Banner eklendi" : "Banner guncellendi");
        setTimeout(() => setSuccess(""), 3000);
        fetchBanners();
      } else {
        const data = await res.json();
        setError(data.error || "Kaydetme basarisiz");
      }
    } catch {
      setError("Bir hata olustu");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu banner'i silmek istediginize emin misiniz?")) return;

    try {
      const res = await fetch(`/api/admin/banners/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSuccess("Banner silindi");
        setTimeout(() => setSuccess(""), 3000);
        fetchBanners();
      }
    } catch {
      setError("Silme basarisiz");
    }
  };

  const getPositionLabel = (value: string) =>
    POSITIONS.find((p) => p.value === value)?.label || value;

  const filteredBanners = filterPosition
    ? banners.filter((b) => b.position === filterPosition)
    : banners;

  /* ---------- Stat computations ---------- */
  const totalBanners = banners.length;
  const activeBanners = banners.filter((b) => b.active).length;
  const passiveBanners = banners.filter((b) => !b.active).length;
  const uniquePositions = new Set(banners.map((b) => b.position)).size;

  /* ---------- Loading state ---------- */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#7AC143]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ───────── Header ───────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Banner Yonetimi
          </h1>
          <p className="mt-1 text-[13px] text-gray-500">
            Kampanya ve tanitim bannerlarini yonetin
          </p>
        </div>
        <Button
          onClick={() =>
            setEditing({ ...emptyBanner, sortOrder: banners.length })
          }
        >
          <Plus className="mr-2 h-4 w-4" />
          Yeni Banner
        </Button>
      </div>

      {/* ───────── Stat Cards ───────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Total */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <Image className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                Toplam Banner
              </p>
              <p className="text-xl font-bold text-gray-900">{totalBanners}</p>
            </div>
          </div>
        </div>
        {/* Active */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                Aktif
              </p>
              <p className="text-xl font-bold text-gray-900">
                {activeBanners}
              </p>
            </div>
          </div>
        </div>
        {/* Passive */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
              <XCircle className="h-5 w-5 text-gray-500" />
            </div>
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                Pasif
              </p>
              <p className="text-xl font-bold text-gray-900">
                {passiveBanners}
              </p>
            </div>
          </div>
        </div>
        {/* Positions */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
              <Layout className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                Pozisyon
              </p>
              <p className="text-xl font-bold text-gray-900">
                {uniquePositions}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ───────── Messages ───────── */}
      {error && (
        <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <XCircle className="h-4 w-4 shrink-0 text-red-500" />
          <span>{error}</span>
          <button
            onClick={() => setError("")}
            className="ml-auto rounded-lg p-0.5 text-red-400 transition-colors hover:bg-red-100 hover:text-red-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
          <span>{success}</span>
          <button
            onClick={() => setSuccess("")}
            className="ml-auto rounded-lg p-0.5 text-emerald-400 transition-colors hover:bg-emerald-100 hover:text-emerald-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ───────── Position Filter Pill Tabs ───────── */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilterPosition("")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            filterPosition === ""
              ? "bg-[#1A1A1A] text-white shadow-sm"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Tumuu ({banners.length})
        </button>
        {POSITIONS.map((p) => {
          const count = banners.filter((b) => b.position === p.value).length;
          return (
            <button
              key={p.value}
              onClick={() =>
                setFilterPosition(filterPosition === p.value ? "" : p.value)
              }
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                filterPosition === p.value
                  ? "bg-[#1A1A1A] text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {p.label}
              {count > 0 && (
                <span className="ml-1.5 opacity-70">({count})</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ───────── Info Tip Card ───────── */}
      <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 px-5 py-4 text-sm leading-relaxed text-blue-700">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
        <span>
          <strong className="font-semibold">Ipucu:</strong> Banner gorselleri
          icin onerilen boyutlar: Desktop 1200x400px, Mobil 768x400px. Format:
          JPG, PNG veya WebP, maks 5 MB. Pozisyona gore farkli boyutlar
          kullanilabilir. AI asistana &ldquo;banner gorseli uret ve
          ekle&rdquo; diyerek otomatik banner olusturabilirsiniz.
        </span>
      </div>

      {/* ───────── Banner Grid ───────── */}
      {filteredBanners.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white py-20 shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
            <Image className="h-7 w-7 text-gray-400" />
          </div>
          <p className="mt-4 text-sm font-medium text-gray-900">
            {filterPosition
              ? "Bu pozisyonda banner bulunamadi"
              : "Henuz banner eklenmemis"}
          </p>
          <p className="mt-1 text-[13px] text-gray-500">
            {filterPosition
              ? "Baska bir pozisyon secin veya yeni banner ekleyin"
              : "Ilk bannerinizi olusturmak icin yukardaki butonu kullanin"}
          </p>
          {!filterPosition && (
            <Button
              size="sm"
              className="mt-5"
              onClick={() =>
                setEditing({ ...emptyBanner, sortOrder: banners.length })
              }
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Banner Ekle
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredBanners.map((banner) => (
            <div
              key={banner.id}
              className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              {/* Card Image Header */}
              <div className="relative h-40 overflow-hidden bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={banner.imageDesktop}
                  alt={banner.altText || banner.name}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {/* Status badge overlay */}
                <div className="absolute right-2 top-2">
                  {banner.active ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                      Aktif
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-500/80 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                      <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
                      Pasif
                    </span>
                  )}
                </div>
              </div>

              {/* Card Info */}
              <div className="p-4">
                <h3 className="text-sm font-semibold text-gray-900 truncate">
                  {banner.name}
                </h3>

                {/* Position label */}
                <div className="mt-2 flex items-center gap-1.5">
                  <Badge variant="subtle" className="gap-1 text-[11px]">
                    <Layout className="h-3 w-3" />
                    {getPositionLabel(banner.position)}
                  </Badge>
                </div>

                {/* Link */}
                {banner.link && (
                  <div className="mt-1 flex items-center gap-1.5 text-[13px] text-gray-400">
                    <Link2 className="h-3.5 w-3.5" />
                    <span className="truncate">{banner.link}</span>
                  </div>
                )}

                {/* Date range */}
                <div className="mt-2 flex items-center gap-1.5 text-[12px] text-gray-400">
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span>
                    {banner.startDate
                      ? `${new Date(banner.startDate).toLocaleDateString("tr-TR")} - ${
                          banner.endDate
                            ? new Date(banner.endDate).toLocaleDateString(
                                "tr-TR"
                              )
                            : "Suresiz"
                        }`
                      : "Suresiz"}
                  </span>
                </div>

                {/* Sort order */}
                <div className="mt-1 text-[12px] text-gray-400">
                  Sira: {banner.sortOrder}
                </div>
              </div>

              {/* Card Actions */}
              <div className="flex items-center border-t border-gray-100 px-4 py-2.5">
                <button
                  onClick={() => setEditing(banner)}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
                >
                  <Edit className="h-3.5 w-3.5" />
                  Duzenle
                </button>
                <button
                  onClick={() => handleDelete(banner.id)}
                  className="ml-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium text-red-500 transition-colors hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Sil
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ───────── Edit / Create Modal ───────── */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-16 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditing(null);
          }}
        >
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-gray-900">
                  {"id" in editing && editing.id
                    ? "Banner Duzenle"
                    : "Yeni Banner"}
                </h2>
                <p className="mt-0.5 text-[13px] text-gray-500">
                  {"id" in editing && editing.id
                    ? "Mevcut banneri guncelleyin"
                    : "Yeni bir kampanya banneri olusturun"}
                </p>
              </div>
              <button
                onClick={() => setEditing(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-5 px-6 py-5">
              {/* Section: Temel Bilgiler */}
              <div>
                <p className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-gray-400">
                  Temel Bilgiler
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Banner Adi *
                    </label>
                    <input
                      type="text"
                      value={editing.name}
                      onChange={(e) =>
                        setEditing({ ...editing, name: e.target.value })
                      }
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
                      placeholder="Yaz Kampanyasi Banner"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Pozisyon *
                    </label>
                    <select
                      value={editing.position}
                      onChange={(e) =>
                        setEditing({ ...editing, position: e.target.value })
                      }
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
                    >
                      {POSITIONS.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-100" />

              {/* Section: Gorseller */}
              <div>
                <p className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-gray-400">
                  Gorseller
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                      <Monitor className="h-3.5 w-3.5 text-gray-400" />
                      Desktop Gorsel *
                    </label>
                    <input
                      type="url"
                      value={editing.imageDesktop}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          imageDesktop: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
                      placeholder="/images/banner-1.jpg"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                      <Smartphone className="h-3.5 w-3.5 text-gray-400" />
                      Mobil Gorsel
                    </label>
                    <input
                      type="url"
                      value={editing.imageMobile || ""}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          imageMobile: e.target.value || null,
                        })
                      }
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
                      placeholder="Istege bagli"
                    />
                  </div>
                </div>

                {/* Preview */}
                {editing.imageDesktop && (
                  <div className="mt-3">
                    <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-wider text-gray-400">
                      Onizleme
                    </p>
                    <div className="overflow-hidden rounded-xl border border-gray-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={editing.imageDesktop}
                        alt="Onizleme"
                        className="h-28 w-full object-cover"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-gray-100" />

              {/* Section: Baglanti & SEO */}
              <div>
                <p className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-gray-400">
                  Baglanti & SEO
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                      <Link2 className="h-3.5 w-3.5 text-gray-400" />
                      Link
                    </label>
                    <input
                      type="text"
                      value={editing.link || ""}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          link: e.target.value || null,
                        })
                      }
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
                      placeholder="/kampanya"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Alt Text
                    </label>
                    <input
                      type="text"
                      value={editing.altText || ""}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          altText: e.target.value || null,
                        })
                      }
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
                      placeholder="Banner aciklamasi"
                    />
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-100" />

              {/* Section: Zamanlama & Durum */}
              <div>
                <p className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-gray-400">
                  Zamanlama & Durum
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                      <CalendarDays className="h-3.5 w-3.5 text-gray-400" />
                      Baslangic
                    </label>
                    <input
                      type="datetime-local"
                      value={
                        editing.startDate
                          ? editing.startDate.substring(0, 16)
                          : ""
                      }
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          startDate: e.target.value || null,
                        })
                      }
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Bitis
                    </label>
                    <input
                      type="datetime-local"
                      value={
                        editing.endDate
                          ? editing.endDate.substring(0, 16)
                          : ""
                      }
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          endDate: e.target.value || null,
                        })
                      }
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
                    />
                  </div>
                  <div className="flex items-end pb-1">
                    <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm transition-colors hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={editing.active}
                        onChange={(e) =>
                          setEditing({ ...editing, active: e.target.checked })
                        }
                        className="h-4 w-4 rounded accent-[#7AC143]"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Aktif
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <Button variant="outline" size="sm" onClick={() => setEditing(null)}>
                Iptal
              </Button>
              <Button size="sm" onClick={handleSave} loading={saving}>
                <Save className="mr-1.5 h-4 w-4" />
                Kaydet
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
