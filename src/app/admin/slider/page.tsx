"use client";

import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, Eye, EyeOff, ArrowUp, ArrowDown, Save, X, Download } from "lucide-react";
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
  const [editing, setEditing] = useState<SliderData | (Omit<SliderData, "id"> & { id?: string }) | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [importing, setImporting] = useState(false);

  const FALLBACK_SLIDES = [
    {
      title: "Kaliteli İç Giyim,",
      subtitle: "Yeni Sezon 2026",
      highlight: "Uygun Fiyat",
      description: "Vorte Tekstil - Erkek boxer ve kadın iç giyim koleksiyonu. Premium kumaş kalitesi ile konfor ve şıklık bir arada.",
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
      description: "Premium modal kumaş ile üretilen kadın iç giyim koleksiyonumuz. Günlük konfor ve şıklığı bir arada sunuyor.",
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
      description: "Perakende satış noktaları için özel toptan fiyatlardan yararlanın.",
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
      const url = isNew ? "/api/admin/sliders" : `/api/admin/sliders/${editing.id}`;
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
      const res = await fetch(`/api/admin/sliders/${id}`, { method: "DELETE" });
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

    // Update both
    await Promise.all([
      fetch(`/api/admin/sliders/${newSliders[index].id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSliders[index]),
      }),
      fetch(`/api/admin/sliders/${newSliders[swapIndex].id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSliders[swapIndex]),
      }),
    ]);

    fetchSliders();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#7AC143]" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Slider Yönetimi</h1>
          <p className="mt-1 text-sm text-gray-500">Ana sayfa slider görselleri</p>
        </div>
        <Button onClick={() => setEditing({ ...emptySlider, sortOrder: sliders.length })}>
          <Plus className="mr-2 h-4 w-4" />
          Yeni Slider
        </Button>
      </div>

      {/* Messages */}
      {error && (
        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}
      {success && (
        <div className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-600">{success}</div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-20">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {"id" in editing && editing.id ? "Slider Düzenle" : "Yeni Slider"}
              </h2>
              <button onClick={() => setEditing(null)} className="rounded p-1 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Üst Başlık
                  </label>
                  <input
                    type="text"
                    value={editing.subtitle || ""}
                    onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })}
                    className="form-input w-full"
                    placeholder="Yeni Sezon 2026"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Başlık
                  </label>
                  <input
                    type="text"
                    value={editing.title || ""}
                    onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                    className="form-input w-full"
                    placeholder="Kaliteli İç Giyim,"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Vurgulanan Metin
                  </label>
                  <input
                    type="text"
                    value={editing.highlight || ""}
                    onChange={(e) => setEditing({ ...editing, highlight: e.target.value })}
                    className="form-input w-full"
                    placeholder="Uygun Fiyat"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Alt Metin</label>
                  <input
                    type="text"
                    value={editing.altText || ""}
                    onChange={(e) => setEditing({ ...editing, altText: e.target.value })}
                    className="form-input w-full"
                    placeholder="SEO alt text"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Açıklama</label>
                <textarea
                  rows={2}
                  value={editing.description || ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  className="form-input w-full"
                  placeholder="Kısa açıklama metni"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Desktop Görsel URL *
                  </label>
                  <input
                    type="url"
                    value={editing.imageDesktop}
                    onChange={(e) => setEditing({ ...editing, imageDesktop: e.target.value })}
                    className="form-input w-full"
                    placeholder="/images/hero-1.png"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-400">Önerilen: 1920x800px</p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Mobil Görsel URL *
                  </label>
                  <input
                    type="url"
                    value={editing.imageMobile}
                    onChange={(e) => setEditing({ ...editing, imageMobile: e.target.value })}
                    className="form-input w-full"
                    placeholder="/images/hero-mobile-1.png"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-400">Önerilen: 768x600px</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Birincil Buton Metni
                  </label>
                  <input
                    type="text"
                    value={editing.buttonText || ""}
                    onChange={(e) => setEditing({ ...editing, buttonText: e.target.value })}
                    className="form-input w-full"
                    placeholder="Erkek Koleksiyonu"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Birincil Buton Linki
                  </label>
                  <input
                    type="text"
                    value={editing.buttonLink || ""}
                    onChange={(e) => setEditing({ ...editing, buttonLink: e.target.value })}
                    className="form-input w-full"
                    placeholder="/erkek-ic-giyim"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    İkincil Buton Metni
                  </label>
                  <input
                    type="text"
                    value={editing.secondaryButtonText || ""}
                    onChange={(e) => setEditing({ ...editing, secondaryButtonText: e.target.value })}
                    className="form-input w-full"
                    placeholder="Kadın Koleksiyonu"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    İkincil Buton Linki
                  </label>
                  <input
                    type="text"
                    value={editing.secondaryButtonLink || ""}
                    onChange={(e) => setEditing({ ...editing, secondaryButtonLink: e.target.value })}
                    className="form-input w-full"
                    placeholder="/kadin-ic-giyim"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Başlangıç Tarihi
                  </label>
                  <input
                    type="datetime-local"
                    value={editing.startDate ? editing.startDate.substring(0, 16) : ""}
                    onChange={(e) => setEditing({ ...editing, startDate: e.target.value || null })}
                    className="form-input w-full"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Bitiş Tarihi
                  </label>
                  <input
                    type="datetime-local"
                    value={editing.endDate ? editing.endDate.substring(0, 16) : ""}
                    onChange={(e) => setEditing({ ...editing, endDate: e.target.value || null })}
                    className="form-input w-full"
                  />
                </div>
                <div className="flex items-end gap-4 pb-1">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editing.active}
                      onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
                      className="h-4 w-4 accent-[#7AC143]"
                    />
                    <span className="text-sm text-gray-700">Aktif</span>
                  </label>
                </div>
              </div>

              {/* Preview */}
              {editing.imageDesktop && (
                <div>
                  <p className="mb-2 text-xs font-medium text-gray-500 uppercase">Desktop Önizleme</p>
                  <div className="relative h-32 overflow-hidden rounded-lg bg-gray-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={editing.imageDesktop}
                      alt="Önizleme"
                      className="h-full w-full object-cover opacity-60"
                    />
                    <div className="absolute inset-0 flex items-center px-6">
                      <div>
                        {editing.subtitle && (
                          <span className="text-xs font-semibold text-[#7AC143] uppercase">
                            {editing.subtitle}
                          </span>
                        )}
                        {editing.title && (
                          <h3 className="text-lg font-bold text-white">{editing.title}</h3>
                        )}
                        {editing.highlight && (
                          <span className="text-lg font-bold text-[#7AC143]">{editing.highlight}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setEditing(null)}>
                İptal
              </Button>
              <Button onClick={handleSave} loading={saving}>
                <Save className="mr-2 h-4 w-4" />
                Kaydet
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Slider List */}
      <div className="mt-6 space-y-3">
        {sliders.length === 0 ? (
          <div className="rounded-lg border bg-white py-12 text-center">
            <p className="text-gray-400">Henüz slider eklenmemiş</p>
            <p className="mt-2 text-sm text-gray-400">
              Anasayfadaki mevcut slider görselleri veritabanına aktarılmamış.
            </p>
            <Button
              onClick={handleImportFallbacks}
              loading={importing}
              className="mt-4"
              variant="outline"
            >
              <Download className="mr-2 h-4 w-4" />
              Mevcut Sliderları İçe Aktar
            </Button>
          </div>
        ) : (
          sliders.map((slider, index) => (
            <div
              key={slider.id}
              className="flex items-center gap-4 rounded-lg border bg-white p-4"
            >
              {/* Thumbnail */}
              <div className="h-20 w-36 flex-shrink-0 overflow-hidden rounded bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={slider.imageDesktop}
                  alt={slider.altText || slider.title || "Slider"}
                  className="h-full w-full object-cover"
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900 truncate">
                    {slider.title || slider.subtitle || `Slider #${index + 1}`}
                  </h3>
                  {slider.active ? (
                    <Badge variant="success">Aktif</Badge>
                  ) : (
                    <Badge variant="outline">Pasif</Badge>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-gray-500 truncate">
                  {slider.description || "Açıklama yok"}
                </p>
                {slider.startDate && (
                  <p className="text-xs text-gray-400">
                    {new Date(slider.startDate).toLocaleDateString("tr-TR")} -{" "}
                    {slider.endDate
                      ? new Date(slider.endDate).toLocaleDateString("tr-TR")
                      : "Süresiz"}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => moveSlider(index, "up")}
                  disabled={index === 0}
                  className="rounded p-1.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30"
                  title="Yukarı"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  onClick={() => moveSlider(index, "down")}
                  disabled={index === sliders.length - 1}
                  className="rounded p-1.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30"
                  title="Aşağı"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setEditing(slider)}
                  className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  title="Düzenle"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={async () => {
                    await fetch(`/api/admin/sliders/${slider.id}`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ ...slider, active: !slider.active }),
                    });
                    fetchSliders();
                  }}
                  className="rounded p-1.5 text-gray-400 hover:bg-gray-100"
                  title={slider.active ? "Pasif Yap" : "Aktif Yap"}
                >
                  {slider.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => handleDelete(slider.id)}
                  className="rounded p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600"
                  title="Sil"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Info */}
      <div className="mt-6 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
        <strong>İpucu:</strong> Slider görselleri için önerilen boyutlar:
        Desktop: 1920×800px, Mobil: 768×600px. Format: JPG, PNG veya WebP, maks 5MB.
      </div>
    </div>
  );
}
