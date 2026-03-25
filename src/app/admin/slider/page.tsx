"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Save,
  X,
  Download,
  CheckCircle,
  XCircle,
  Image,
  Layers,
  Monitor,
  Smartphone,
  GripVertical,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface SliderData {
  id: string;
  title: string | null;
  subtitle: string | null;
  highlight: string | null;
  description: string | null;
  buttonText: string | null;
  buttonLink: string | null;
  secondaryButtonText: string | null;
  secondaryButtonLink: string | null;
  imageDesktop: string;
  imageMobile: string;
  altText: string | null;
  sortOrder: number;
  active: boolean;
  startDate: string | null;
  endDate: string | null;
}

const emptySlider: Omit<SliderData, "id"> = {
  title: "",
  subtitle: "",
  highlight: "",
  description: "",
  buttonText: "",
  buttonLink: "",
  secondaryButtonText: "",
  secondaryButtonLink: "",
  imageDesktop: "",
  imageMobile: "",
  altText: "",
  sortOrder: 0,
  active: true,
  startDate: null,
  endDate: null,
};

export default function AdminSliderPage() {
  const [sliders, setSliders] = useState<SliderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<
    SliderData | (Omit<SliderData, "id"> & { id?: string }) | null
  >(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [importing, setImporting] = useState(false);

  const FALLBACK_SLIDES = [
    {
      title: "Kaliteli İç Giyim,",
      subtitle: "Yeni Sezon 2026",
      highlight: "Uygun Fiyat",
      description:
        "Vorte Tekstil - Erkek boxer ve kadın iç giyim koleksiyonu. Premium kumaş kalitesi ile konfor ve şıklık bir arada.",
      buttonText: "Erkek Koleksiyonu",
      buttonLink: "/erkek-ic-giyim",
      secondaryButtonText: "Kadın Koleksiyonu",
      secondaryButtonLink: "/kadin-ic-giyim",
      imageDesktop: "/images/hero-1.png",
      imageMobile: "/images/hero-mobile-1.png",
      sortOrder: 0,
      active: true,
    },
    {
      title: "Zarif Tasarım,",
      subtitle: "Kadın Koleksiyonu",
      highlight: "Üstün Konfor",
      description:
        "Premium modal kumaş ile üretilen kadın iç giyim koleksiyonumuz. Günlük konfor ve şıklığı bir arada sunuyor.",
      buttonText: "Kadın Koleksiyonu",
      buttonLink: "/kadin-ic-giyim",
      secondaryButtonText: "Erkek Koleksiyonu",
      secondaryButtonLink: "/erkek-ic-giyim",
      imageDesktop: "/images/hero-2.png",
      imageMobile: "/images/hero-mobile-2.png",
      sortOrder: 1,
      active: true,
    },
    {
      title: "Bayilik Fırsatı,",
      subtitle: "Toptan Satış",
      highlight: "%45'e Varan İndirim",
      description:
        "Perakende satış noktaları için özel toptan fiyatlardan yararlanın.",
      buttonText: "Toptan Satış",
      buttonLink: "/toptan",
      secondaryButtonText: "Bayi Girişi",
      secondaryButtonLink: "/bayi-girisi",
      imageDesktop: "/images/hero-3.png",
      imageMobile: "/images/hero-mobile-1.png",
      sortOrder: 2,
      active: true,
    },
  ];

  const handleImportFallbacks = async () => {
    setImporting(true);
    setError("");
    try {
      for (const slide of FALLBACK_SLIDES) {
        const res = await fetch("/api/admin/sliders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(slide),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "İçe aktarma başarısız");
        }
      }
      setSuccess("3 slider başarıyla içe aktarıldı");
      setTimeout(() => setSuccess(""), 3000);
      fetchSliders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "İçe aktarma hatası");
    } finally {
      setImporting(false);
    }
  };

  const fetchSliders = async () => {
    const res = await fetch("/api/admin/sliders");
    const data = await res.json();
    setSliders(data.sliders || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchSliders();
  }, []);

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.imageDesktop || !editing.imageMobile) {
      setError("Desktop ve mobil görseller zorunludur");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const isNew = !("id" in editing) || !editing.id;
      const url = isNew
        ? "/api/admin/sliders"
        : `/api/admin/sliders/${editing.id}`;
      const method = isNew ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });

      if (res.ok) {
        setEditing(null);
        setSuccess(isNew ? "Slider eklendi" : "Slider güncellendi");
        setTimeout(() => setSuccess(""), 3000);
        fetchSliders();
      } else {
        const data = await res.json();
        setError(data.error || "Kaydetme başarısız");
      }
    } catch {
      setError("Bir hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu slider'ı silmek istediğinize emin misiniz?")) return;

    try {
      const res = await fetch(`/api/admin/sliders/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSuccess("Slider silindi");
        setTimeout(() => setSuccess(""), 3000);
        fetchSliders();
      }
    } catch {
      setError("Silme başarısız");
    }
  };

  const moveSlider = async (index: number, direction: "up" | "down") => {
    const newSliders = [...sliders];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newSliders.length) return;

    // Swap sortOrder
    const tempOrder = newSliders[index].sortOrder;
    newSliders[index].sortOrder = newSliders[swapIndex].sortOrder;
    newSliders[swapIndex].sortOrder = tempOrder;

    // Optimistik UI güncelle
    const sorted = [...newSliders].sort((a, b) => a.sortOrder - b.sortOrder);
    setSliders(sorted);

    try {
      const [res1, res2] = await Promise.all([
        fetch(`/api/admin/sliders/${newSliders[index].id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: newSliders[index].sortOrder }),
        }),
        fetch(`/api/admin/sliders/${newSliders[swapIndex].id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: newSliders[swapIndex].sortOrder }),
        }),
      ]);

      if (!res1.ok || !res2.ok) {
        setError("Sıralama güncellenemedi");
        fetchSliders();
        return;
      }

      setSuccess("Sıralama güncellendi");
      setTimeout(() => setSuccess(""), 2000);
    } catch {
      setError("Sıralama güncellenirken hata oluştu");
      fetchSliders();
    }
  };

  const activeCount = sliders.filter((s) => s.active).length;
  const passiveCount = sliders.filter((s) => !s.active).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#7AC143]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Slider Yönetimi
            </h1>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                <Layers className="h-3 w-3" />
                {sliders.length} Toplam
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {activeCount} Aktif
              </span>
              {passiveCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                  {passiveCount} Pasif
                </span>
              )}
            </div>
          </div>
          <p className="mt-1 text-[13px] text-gray-500">
            Ana sayfa slider görselleri ve sıralamasını yönetin
          </p>
        </div>
        <Button
          onClick={() =>
            setEditing({ ...emptySlider, sortOrder: sliders.length })
          }
        >
          <Plus className="mr-2 h-4 w-4" />
          Yeni Slider
        </Button>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          <XCircle className="h-4 w-4 flex-shrink-0 text-red-500" />
          <span>{error}</span>
          <button
            onClick={() => setError("")}
            className="ml-auto rounded-lg p-0.5 hover:bg-red-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle className="h-4 w-4 flex-shrink-0 text-emerald-500" />
          <span>{success}</span>
          <button
            onClick={() => setSuccess("")}
            className="ml-auto rounded-lg p-0.5 hover:bg-emerald-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 backdrop-blur-sm p-4 pt-16">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-gray-900">
                  {"id" in editing && editing.id
                    ? "Slider Düzenle"
                    : "Yeni Slider"}
                </h2>
                <p className="mt-0.5 text-[13px] text-gray-500">
                  Slider içerik ve görsellerini yapılandırın
                </p>
              </div>
              <button
                onClick={() => setEditing(null)}
                className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="max-h-[calc(100vh-12rem)] overflow-y-auto px-6 py-5">
              {/* Section: İçerik */}
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <Layers className="h-4 w-4 text-gray-400" />
                  İçerik
                </h3>
                <div className="mt-4 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                        Üst Başlık
                      </label>
                      <input
                        type="text"
                        value={editing.subtitle || ""}
                        onChange={(e) =>
                          setEditing({ ...editing, subtitle: e.target.value })
                        }
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20 transition-colors"
                        placeholder="Yeni Sezon 2026"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                        Başlık
                      </label>
                      <input
                        type="text"
                        value={editing.title || ""}
                        onChange={(e) =>
                          setEditing({ ...editing, title: e.target.value })
                        }
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20 transition-colors"
                        placeholder="Kaliteli İç Giyim,"
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                        Vurgulanan Metin
                      </label>
                      <input
                        type="text"
                        value={editing.highlight || ""}
                        onChange={(e) =>
                          setEditing({ ...editing, highlight: e.target.value })
                        }
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20 transition-colors"
                        placeholder="Uygun Fiyat"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                        Alt Metin (SEO)
                      </label>
                      <input
                        type="text"
                        value={editing.altText || ""}
                        onChange={(e) =>
                          setEditing({ ...editing, altText: e.target.value })
                        }
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20 transition-colors"
                        placeholder="SEO alt text"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Açıklama
                    </label>
                    <textarea
                      rows={2}
                      value={editing.description || ""}
                      onChange={(e) =>
                        setEditing({ ...editing, description: e.target.value })
                      }
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20 transition-colors resize-none"
                      placeholder="Kısa açıklama metni"
                    />
                  </div>
                </div>
              </div>

              {/* Section: Görseller */}
              <div className="border-t border-gray-100 pt-5 mt-5">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <Image className="h-4 w-4 text-gray-400" />
                  Görseller
                </h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                      <Monitor className="h-3.5 w-3.5 text-gray-400" />
                      Desktop Görsel URL
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="url"
                      value={editing.imageDesktop}
                      onChange={(e) =>
                        setEditing({ ...editing, imageDesktop: e.target.value })
                      }
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20 transition-colors"
                      placeholder="/images/hero-1.png"
                      required
                    />
                    <p className="mt-1.5 text-xs text-gray-400">
                      Önerilen: 1920x800px
                    </p>
                  </div>
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                      <Smartphone className="h-3.5 w-3.5 text-gray-400" />
                      Mobil Görsel URL
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="url"
                      value={editing.imageMobile}
                      onChange={(e) =>
                        setEditing({ ...editing, imageMobile: e.target.value })
                      }
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20 transition-colors"
                      placeholder="/images/hero-mobile-1.png"
                      required
                    />
                    <p className="mt-1.5 text-xs text-gray-400">
                      Önerilen: 768x600px
                    </p>
                  </div>
                </div>
              </div>

              {/* Section: Butonlar */}
              <div className="border-t border-gray-100 pt-5 mt-5">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <GripVertical className="h-4 w-4 text-gray-400" />
                  Butonlar
                </h3>
                <div className="mt-4 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                        Birincil Buton Metni
                      </label>
                      <input
                        type="text"
                        value={editing.buttonText || ""}
                        onChange={(e) =>
                          setEditing({ ...editing, buttonText: e.target.value })
                        }
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20 transition-colors"
                        placeholder="Erkek Koleksiyonu"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                        Birincil Buton Linki
                      </label>
                      <input
                        type="text"
                        value={editing.buttonLink || ""}
                        onChange={(e) =>
                          setEditing({ ...editing, buttonLink: e.target.value })
                        }
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20 transition-colors"
                        placeholder="/erkek-ic-giyim"
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                        İkincil Buton Metni
                      </label>
                      <input
                        type="text"
                        value={editing.secondaryButtonText || ""}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            secondaryButtonText: e.target.value,
                          })
                        }
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20 transition-colors"
                        placeholder="Kadın Koleksiyonu"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                        İkincil Buton Linki
                      </label>
                      <input
                        type="text"
                        value={editing.secondaryButtonLink || ""}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            secondaryButtonLink: e.target.value,
                          })
                        }
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20 transition-colors"
                        placeholder="/kadin-ic-giyim"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section: Zamanlama */}
              <div className="border-t border-gray-100 pt-5 mt-5">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <CalendarDays className="h-4 w-4 text-gray-400" />
                  Zamanlama
                </h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Başlangıç Tarihi
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
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Bitiş Tarihi
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
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20 transition-colors"
                    />
                  </div>
                  <div className="flex items-end pb-1">
                    <label className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm cursor-pointer hover:border-[#7AC143]/40 transition-colors w-full">
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
                      <span
                        className={`ml-auto h-2 w-2 rounded-full ${editing.active ? "bg-emerald-500" : "bg-gray-300"}`}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Desktop Preview */}
              {editing.imageDesktop && (
                <div className="border-t border-gray-100 pt-5 mt-5">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
                    <Monitor className="h-4 w-4 text-gray-400" />
                    Desktop Önizleme
                  </h3>
                  <div className="relative h-36 overflow-hidden rounded-xl bg-gray-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={editing.imageDesktop}
                      alt="Önizleme"
                      className="h-full w-full object-cover opacity-50"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />
                    <div className="absolute inset-0 flex items-center px-8">
                      <div className="space-y-1">
                        {editing.subtitle && (
                          <span className="block text-[10px] font-bold uppercase tracking-widest text-[#7AC143]">
                            {editing.subtitle}
                          </span>
                        )}
                        {editing.title && (
                          <h3 className="text-xl font-bold leading-tight text-white">
                            {editing.title}
                          </h3>
                        )}
                        {editing.highlight && (
                          <span className="block text-xl font-bold text-[#7AC143]">
                            {editing.highlight}
                          </span>
                        )}
                        {editing.description && (
                          <p className="max-w-xs text-[11px] leading-relaxed text-white/70 line-clamp-2">
                            {editing.description}
                          </p>
                        )}
                        {editing.buttonText && (
                          <div className="flex gap-2 pt-1">
                            <span className="inline-block rounded bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-gray-900">
                              {editing.buttonText}
                            </span>
                            {editing.secondaryButtonText && (
                              <span className="inline-block rounded border border-white/40 px-2.5 py-1 text-[10px] font-semibold text-white/80">
                                {editing.secondaryButtonText}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <Button variant="outline" size="sm" onClick={() => setEditing(null)}>
                İptal
              </Button>
              <Button size="sm" onClick={handleSave} loading={saving}>
                <Save className="mr-1.5 h-4 w-4" />
                Kaydet
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Slider List */}
      {sliders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-white p-12">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50">
            <Image className="h-8 w-8 text-gray-300" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-gray-900">
            Henüz slider eklenmemiş
          </h3>
          <p className="mt-1.5 max-w-sm text-center text-[13px] text-gray-500">
            Anasayfadaki mevcut slider görselleri veritabanına aktarılmamış.
            Mevcut slider verilerini hızlıca içe aktarabilirsiniz.
          </p>
          <div className="mt-6 flex gap-3">
            <Button
              onClick={handleImportFallbacks}
              loading={importing}
              variant="outline"
            >
              <Download className="mr-2 h-4 w-4" />
              Mevcut Sliderları İçe Aktar
            </Button>
            <Button
              onClick={() =>
                setEditing({ ...emptySlider, sortOrder: sliders.length })
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Yeni Slider Ekle
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {sliders.map((slider, index) => (
            <div
              key={slider.id}
              className={`group flex items-center gap-0 rounded-2xl border bg-white shadow-sm overflow-hidden hover:shadow-md transition-all ${
                slider.active
                  ? "border-gray-100"
                  : "border-gray-100 opacity-60"
              }`}
            >
              {/* Thumbnail */}
              <div className="relative h-28 w-48 flex-shrink-0 bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={slider.imageDesktop}
                  alt={slider.altText || slider.title || "Slider"}
                  className="h-full w-full object-cover"
                />
                {/* Sort Order Badge */}
                <span className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-[11px] font-bold text-white">
                  {slider.sortOrder + 1}
                </span>
                {/* Active indicator dot */}
                <span
                  className={`absolute right-2 top-2 h-2.5 w-2.5 rounded-full ring-2 ring-white ${
                    slider.active ? "bg-emerald-500" : "bg-gray-400"
                  }`}
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 px-5 py-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {slider.title || slider.subtitle || `Slider #${index + 1}`}
                  </h3>
                  {slider.active ? (
                    <Badge variant="success" className="text-[10px]">
                      Aktif
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">
                      Pasif
                    </Badge>
                  )}
                </div>
                {slider.highlight && (
                  <p className="mt-0.5 text-sm font-medium text-[#7AC143]">
                    {slider.highlight}
                  </p>
                )}
                <p className="mt-1 text-[13px] text-gray-500 truncate max-w-md">
                  {slider.description || "Açıklama yok"}
                </p>
                {(slider.startDate || slider.endDate) && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-400">
                    <CalendarDays className="h-3 w-3" />
                    <span>
                      {slider.startDate
                        ? new Date(slider.startDate).toLocaleDateString(
                            "tr-TR",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }
                          )
                        : "Başlangıç yok"}
                      {" - "}
                      {slider.endDate
                        ? new Date(slider.endDate).toLocaleDateString("tr-TR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "Süresiz"}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-0.5 px-4 opacity-70 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => moveSlider(index, "up")}
                  disabled={index === 0}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  title="Yukarı"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  onClick={() => moveSlider(index, "down")}
                  disabled={index === sliders.length - 1}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  title="Aşağı"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>

                <div className="mx-1.5 h-5 w-px bg-gray-200" />

                <button
                  onClick={() => setEditing(slider)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                  title="Düzenle"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={async () => {
                    await fetch(`/api/admin/sliders/${slider.id}`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        ...slider,
                        active: !slider.active,
                      }),
                    });
                    fetchSliders();
                  }}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                  title={slider.active ? "Pasif Yap" : "Aktif Yap"}
                >
                  {slider.active ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => handleDelete(slider.id)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                  title="Sil"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Import fallbacks button (when sliders exist but user wants to reimport) */}
      {sliders.length > 0 && sliders.length < 3 && (
        <div className="flex items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-8">
          <div className="text-center">
            <Download className="mx-auto h-6 w-6 text-gray-300" />
            <p className="mt-2 text-sm font-medium text-gray-500">
              Varsayılan slider verilerini içe aktarın
            </p>
            <Button
              onClick={handleImportFallbacks}
              loading={importing}
              variant="ghost"
              size="sm"
              className="mt-2"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              İçe Aktar
            </Button>
          </div>
        </div>
      )}

      {/* Info Tip */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
        <div className="flex gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100">
            <Image className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-blue-900">
              Görsel Boyut Rehberi
            </p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-blue-700">
              Desktop: 1920x800px, Mobil: 768x600px. Desteklenen formatlar: JPG,
              PNG veya WebP. Maksimum dosya boyutu: 5MB. Optimum performans için
              WebP formatı önerilir.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
