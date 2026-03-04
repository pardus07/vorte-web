/**
 * Vorte Admin AI Agent — Sayfa Bağlamı ve Context Builder
 * usePathname() ile alınan sayfa yoluna göre dinamik context oluşturur.
 */

export interface PageContext {
  /** Hızlı eylem butonları (sayfa bazlı) */
  shortcuts: string[];
  /** Otomatik çağrılacak tool'lar (açılışta bilgi çekme) */
  autoTools: string[];
  /** Sayfa başlığı (Türkçe) */
  pageTitle: string;
}

/**
 * Admin sayfa yoluna göre context döndür
 */
export function getPageContext(pathname: string): PageContext {
  // Normalize: trailing slash kaldır
  const path = pathname.replace(/\/$/, "") || "/admin";

  const contextMap: Record<string, PageContext> = {
    "/admin": {
      pageTitle: "Dashboard",
      autoTools: ["get_dashboard"],
      shortcuts: [
        "Bugünkü satış ne?",
        "Bekleyen sipariş var mı?",
        "Stok uyarısı var mı?",
        "Bu haftanın özeti",
      ],
    },
    "/admin/siparisler": {
      pageTitle: "Siparişler",
      autoTools: ["get_orders"],
      shortcuts: [
        "Bekleyen siparişleri göster",
        "Bugünkü siparişler",
        "Toplu kargola",
        "İade bekleyenler",
      ],
    },
    "/admin/urunler": {
      pageTitle: "Ürünler",
      autoTools: ["get_products"],
      shortcuts: [
        "Yeni ürün ekle",
        "Stokta azalanlar",
        "Fiyat güncelle",
        "Tüm ürünlerin SEO durumu",
      ],
    },
    "/admin/bayiler": {
      pageTitle: "Bayiler",
      autoTools: ["get_dealers"],
      shortcuts: [
        "Bekleyen başvurular",
        "Cari bakiye özetleri",
        "Yeni bayi ekle",
        "Bayi sipariş raporu",
      ],
    },
    "/admin/blog": {
      pageTitle: "Blog",
      autoTools: ["get_blog_posts"],
      shortcuts: [
        "Yeni blog yazısı oluştur",
        "SEO uyumlu yazı yaz",
        "Taslakları göster",
        "En çok okunanlar",
      ],
    },
    "/admin/raporlar": {
      pageTitle: "Raporlar",
      autoTools: ["get_reports"],
      shortcuts: [
        "Bu ayın kârı",
        "En çok satan ürünler",
        "Bayi vs perakende karşılaştırma",
        "Yıllık trend",
      ],
    },
    "/admin/uretim": {
      pageTitle: "Üretim",
      autoTools: ["get_production_orders"],
      shortcuts: [
        "Aktif üretimler",
        "Geciken üretimler",
        "Yeni üretim emri",
        "Maliyet analizi",
      ],
    },
    "/admin/kuponlar": {
      pageTitle: "Kuponlar",
      autoTools: ["get_coupons"],
      shortcuts: [
        "Yeni kampanya oluştur",
        "Aktif kuponlar",
        "Süresi dolanlar",
        "%20 indirim kuponu oluştur",
      ],
    },
    "/admin/seo": {
      pageTitle: "SEO",
      autoTools: ["get_seo_status"],
      shortcuts: [
        "SEO durumu",
        "Eksik meta tag'ler",
        "Toplu SEO güncelle",
        "Sitemap yenile",
      ],
    },
    "/admin/google-merchant": {
      pageTitle: "Google Merchant",
      autoTools: ["get_merchant_status"],
      shortcuts: [
        "Feed durumu",
        "GTIN eksikler",
        "Senkronize et",
        "Hatalı ürünler",
      ],
    },
    "/admin/mesajlar": {
      pageTitle: "Mesajlar",
      autoTools: ["get_messages"],
      shortcuts: [
        "Okunmamış mesajlar",
        "Yanıtlanmamış mesajlar",
        "Son 24 saat",
      ],
    },
    "/admin/faturalar": {
      pageTitle: "Faturalar",
      autoTools: ["get_invoices"],
      shortcuts: [
        "Bekleyen faturalar",
        "Bugünkü faturalar",
        "Fatura kes",
      ],
    },
    "/admin/ayarlar": {
      pageTitle: "Ayarlar",
      autoTools: ["get_settings"],
      shortcuts: [
        "SMTP ayarla",
        "SEO güncelle",
        "Logo değiştir",
        "Kargo ayarları",
      ],
    },
    "/admin/chat": {
      pageTitle: "Chat Monitör",
      autoTools: ["get_chat_sessions"],
      shortcuts: [
        "Aktif sohbetler",
        "Müdahale gereken chatler",
        "Chat istatistikleri",
      ],
    },
    "/admin/maliyet": {
      pageTitle: "Maliyet",
      autoTools: [],
      shortcuts: [
        "Maliyet hesapla",
        "Kâr marjı analizi",
        "Ürün bazlı maliyet",
      ],
    },
    "/admin/kullanicilar": {
      pageTitle: "Kullanıcılar",
      autoTools: ["get_admin_users"],
      shortcuts: [
        "Kullanıcı listesi",
        "Yeni editör ekle",
        "Yetki düzenle",
      ],
    },
    "/admin/musteriler": {
      pageTitle: "Müşteriler",
      autoTools: ["get_customers"],
      shortcuts: [
        "Müşteri ara",
        "En çok sipariş verenler",
        "Yeni müşteriler",
      ],
    },
    "/admin/email-sablonlari": {
      pageTitle: "E-posta Şablonları",
      autoTools: ["get_email_templates"],
      shortcuts: [
        "Şablon düzenle",
        "Yeni şablon oluştur",
        "Sipariş onay e-postası",
      ],
    },
    "/admin/email-log": {
      pageTitle: "E-posta Log",
      autoTools: ["get_email_log"],
      shortcuts: [
        "Başarısız gönderimler",
        "Son gönderimler",
      ],
    },
    "/admin/slider": {
      pageTitle: "Slider",
      autoTools: [],
      shortcuts: [
        "Yeni slider ekle",
        "Aktif slider'lar",
        "Slider sırasını değiştir",
      ],
    },
    "/admin/bannerlar": {
      pageTitle: "Bannerlar",
      autoTools: [],
      shortcuts: [
        "Banner ekle",
        "Aktif bannerlar",
        "Pozisyon değiştir",
      ],
    },
    "/admin/fiyatlandirma": {
      pageTitle: "Fiyatlandırma",
      autoTools: [],
      shortcuts: [
        "Fiyat matrisi",
        "Toptan fiyat güncelle",
        "Bayi iskonto ayarla",
      ],
    },
    "/admin/bildirimler": {
      pageTitle: "Bildirimler",
      autoTools: ["get_notifications"],
      shortcuts: [
        "Okunmamış bildirimler",
        "Tümünü okundu yap",
      ],
    },
    "/admin/sayfalar": {
      pageTitle: "Sayfalar",
      autoTools: ["get_pages"],
      shortcuts: [
        "Sayfa listesi",
        "Yeni sayfa oluştur",
        "KVKK sayfasını güncelle",
      ],
    },
    "/admin/yorumlar": {
      pageTitle: "Yorumlar",
      autoTools: ["get_reviews"],
      shortcuts: [
        "Bekleyen yorumlar",
        "Onaysız yorumlar",
        "Düşük puanlılar",
      ],
    },
    "/admin/kargo": {
      pageTitle: "Kargo",
      autoTools: [],
      shortcuts: [
        "Kargolanacak siparişler",
        "Kargo durumu sorgula",
        "Bugün gönderilen kargolar",
      ],
    },
  };

  return (
    contextMap[path] || {
      pageTitle: "Admin Panel",
      autoTools: [],
      shortcuts: [
        "Bugünkü özet",
        "Blog yazısı oluştur",
        "Sipariş durumu",
      ],
    }
  );
}
