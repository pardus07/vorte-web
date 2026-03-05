"use client";

import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, Save, X, Info } from "lucide-react";
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
  { value: "homepage-top", label: "Ana Sayfa - Üst" },
  { value: "homepage-mid", label: "Ana Sayfa - Orta" },
  { value: "homepage-bottom", label: "Ana Sayfa - Alt" },
  { value: "category-top", label: "Kategori Sayfası - Üst" },
  { value: "product-sidebar", label: "Ürün Sayfası - Kenar" },
  { value: "checkout", label: "Ödeme Sayfası" },
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
  const [editing, setEditing] = useState<BannerData | (typeof emptyBanner & { id?: string }) | null>(null);
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
      setError("Ad ve desktop görseli zorunludur");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const isNew = !("id" in editing) || !editing.id;
      const url = isNew ? "/api/admin/banners" : `/api/admin/banners/${editing.id}`;
      const method = isNew ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });

      if (res.ok) {
        setEditing(null);
        setSuccess(isNew ? "Banner eklendi" : "Banner güncellendi");
        setTimeout(() => setSuccess(""), 3000);
        fetchBanners();
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
    if (!confirm("Bu banner'ı silmek istediğinize emin misiniz?")) return;

    try {
      const res = await fetch(`/api/admin/banners/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSuccess("Banner silindi");
        setTimeout(() => setSuccess(""), 3000);
        fetchBanners();
      }
    } catch {
      setError("Silme başarısız");
    }
  };

  const getPositionLabel = (value: string) =>
    POSITIONS.find((p) => p.value === value)?.label || value;

  const filteredBanners = filterPosition
    ? banners.filter((b) => b.position === filterPosition)
    : banners;

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
          <h1 className="text-2xl font-bold text-gray-900">Banner Yönetimi</h1>
          <p className="mt-1 text-sm text-gray-500">Kampanya ve tanıtım bannerları</p>
        </div>
        <Button onClick={() => setEditing({ ...emptyBanner, sortOrder: banners.length })}>
          <Plus className="mr-2 h-4 w-4" />
          Yeni Banner
        </Button>
      </div>

      {/* Messages */}
      {error && (
        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}
      {success && (
        <div className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-600">{success}</div>
      )}

      {/* Filter */}
      <div className="mt-6 flex items-center gap-3">
        <label className="text-sm font-medium text-gray-600">Pozisyon:</label>
        <select
          value={filterPosition}
          onChange={(e) => setFilterPosition(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-[#7AC143] focus:outline-none"
        >
          <option value="">Tümü</option>
          {POSITIONS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <span className="text-sm text-gray-400">{filteredBanners.length} banner</span>
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-20">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {"id" in editing && editing.id ? "Banner Düzenle" : "Yeni Banner"}
              </h2>
              <button onClick={() => setEditing(null)} className="rounded p-1 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Banner Adı *</label>
                <input
                  type="text"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="form-input w-full"
                  placeholder="Yaz Kampanyası Banner"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Pozisyon *</label>
                <select
                  value={editing.position}
                  onChange={(e) => setEditing({ ...editing, position: e.target.value })}
                  className="form-input w-full"
                >
                  {POSITIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
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
                    placeholder="/images/banner-1.jpg"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Mobil Görsel URL
                  </label>
                  <input
                    type="url"
                    value={editing.imageMobile || ""}
                    onChange={(e) => setEditing({ ...editing, imageMobile: e.target.value || null })}
                    className="form-input w-full"
                    placeholder="İsteğe bağlı"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Link</label>
                  <input
                    type="text"
                    value={editing.link || ""}
                    onChange={(e) => setEditing({ ...editing, link: e.target.value || null })}
                    className="form-input w-full"
                    placeholder="/kampanya"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Alt Text</label>
                  <input
                    type="text"
                    value={editing.altText || ""}
                    onChange={(e) => setEditing({ ...editing, altText: e.target.value || null })}
                    className="form-input w-full"
                    placeholder="Banner açıklaması"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Başlangıç
                  </label>
                  <input
                    type="datetime-local"
                    value={editing.startDate ? editing.startDate.substring(0, 16) : ""}
                    onChange={(e) => setEditing({ ...editing, startDate: e.target.value || null })}
                    className="form-input w-full"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Bitiş</label>
                  <input
                    type="datetime-local"
                    value={editing.endDate ? editing.endDate.substring(0, 16) : ""}
                    onChange={(e) => setEditing({ ...editing, endDate: e.target.value || null })}
                    className="form-input w-full"
                  />
                </div>
                <div className="flex items-end pb-1">
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
                  <p className="mb-2 text-xs font-medium text-gray-500 uppercase">Önizleme</p>
                  <div className="h-24 overflow-hidden rounded-lg border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={editing.imageDesktop}
                      alt="Önizleme"
                      className="h-full w-full object-cover"
                    />
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

      {/* İpucu */}
      <div className="mt-4 flex items-start gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          <strong>İpucu:</strong> Banner görselleri için önerilen boyutlar: Desktop: 1200×400px, Mobil: 768×400px.
          Format: JPG, PNG veya WebP, maks 5MB. Pozisyona göre farklı boyutlar kullanılabilir.
          AI asistana &ldquo;banner görseli üret ve ekle&rdquo; diyerek otomatik banner oluşturabilirsiniz.
        </span>
      </div>

      {/* Banner List */}
      <div className="mt-4 overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-700">Görsel</th>
              <th className="px-4 py-3 font-medium text-gray-700">Ad</th>
              <th className="px-4 py-3 font-medium text-gray-700">Pozisyon</th>
              <th className="px-4 py-3 font-medium text-gray-700">Durum</th>
              <th className="px-4 py-3 font-medium text-gray-700">Tarih</th>
              <th className="px-4 py-3 font-medium text-gray-700">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredBanners.map((banner) => (
              <tr key={banner.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="h-12 w-24 overflow-hidden rounded bg-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={banner.imageDesktop}
                      alt={banner.altText || banner.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{banner.name}</p>
                  {banner.link && (
                    <p className="text-xs text-gray-400">{banner.link}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {getPositionLabel(banner.position)}
                </td>
                <td className="px-4 py-3">
                  {banner.active ? (
                    <Badge variant="success">Aktif</Badge>
                  ) : (
                    <Badge variant="outline">Pasif</Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {banner.startDate
                    ? `${new Date(banner.startDate).toLocaleDateString("tr-TR")} - ${
                        banner.endDate
                          ? new Date(banner.endDate).toLocaleDateString("tr-TR")
                          : "Süresiz"
                      }`
                    : "Süresiz"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button
                      onClick={() => setEditing(banner)}
                      className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      title="Düzenle"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(banner.id)}
                      className="rounded p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600"
                      title="Sil"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredBanners.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                  {filterPosition ? "Bu pozisyonda banner yok" : "Henüz banner eklenmemiş"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
