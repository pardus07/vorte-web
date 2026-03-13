/**
 * Vorte Admin AI Agent — 67 Tool Function Declarations
 * Gemini Native Function Calling için tüm tool tanımları
 *
 * Her tool mevcut /api/admin/* endpoint'ini çağırır.
 * Yeni API yazılmaz — sadece mevcut endpoint'lere yönlendirilir.
 */

import { SchemaType } from "@google/generative-ai";
import type { FunctionDeclaration } from "@google/generative-ai";

// ─── Onay Seviyeleri ─────────────────────────────────────────
export type ApprovalLevel = 1 | 2 | 3;
// SEVİYE 1: Bilgi — onaysız çalıştır
// SEVİYE 2: Oluşturma/Güncelleme — önizleme + tek onay
// SEVİYE 3: Kritik (silme/iade/toplu) — çift onay

export interface ToolMeta {
  approvalLevel: ApprovalLevel;
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Dinamik URL için parametre adı (örn: "id" → /api/admin/products/{id}) */
  pathParam?: string;
  /** Türkçe işlem açıklaması */
  description: string;
}

// ─── Tool Meta Verileri (endpoint + method + onay seviyesi) ──
export const TOOL_META: Record<string, ToolMeta> = {
  // ── Kategori 1: Dashboard & Raporlar ──
  get_dashboard: {
    approvalLevel: 1,
    endpoint: "/api/admin/dashboard",
    method: "GET",
    description: "Dashboard istatistikleri",
  },
  get_reports: {
    approvalLevel: 1,
    endpoint: "/api/admin/reports",
    method: "GET",
    description: "Satış ve sipariş raporları",
  },
  calculate_cost: {
    approvalLevel: 1,
    endpoint: "/api/admin/costs",
    method: "GET",
    description: "Maliyet hesaplama",
  },
  save_cost: {
    approvalLevel: 2,
    endpoint: "/api/admin/costs",
    method: "POST",
    description: "Maliyet kaydı oluştur",
  },

  // ── Kategori 2: Ürün Yönetimi ──
  get_products: {
    approvalLevel: 1,
    endpoint: "/api/admin/products",
    method: "GET",
    description: "Ürün listesi",
  },
  get_product: {
    approvalLevel: 1,
    endpoint: "/api/admin/products",
    method: "GET",
    pathParam: "id",
    description: "Ürün detayı",
  },
  create_product: {
    approvalLevel: 2,
    endpoint: "/api/admin/products",
    method: "POST",
    description: "Yeni ürün oluştur",
  },
  update_product: {
    approvalLevel: 2,
    endpoint: "/api/admin/products",
    method: "PUT",
    pathParam: "id",
    description: "Ürün güncelle",
  },
  delete_product: {
    approvalLevel: 3,
    endpoint: "/api/admin/products",
    method: "DELETE",
    pathParam: "id",
    description: "Ürün sil",
  },
  get_categories: {
    approvalLevel: 1,
    endpoint: "/api/admin/categories",
    method: "GET",
    description: "Kategori listesi",
  },

  // ── Kategori 3: Sipariş Yönetimi ──
  get_orders: {
    approvalLevel: 1,
    endpoint: "/api/admin/orders",
    method: "GET",
    description: "Sipariş listesi",
  },
  get_order: {
    approvalLevel: 1,
    endpoint: "/api/admin/orders",
    method: "GET",
    pathParam: "id",
    description: "Sipariş detayı",
  },
  update_order: {
    approvalLevel: 2,
    endpoint: "/api/admin/orders",
    method: "PATCH",
    pathParam: "id",
    description: "Sipariş durumu güncelle",
  },
  delete_order: {
    approvalLevel: 3,
    endpoint: "/api/admin/orders",
    method: "DELETE",
    pathParam: "id",
    description: "Sipariş sil",
  },
  batch_update_orders: {
    approvalLevel: 3,
    endpoint: "/api/admin/orders/batch",
    method: "POST",
    description: "Toplu sipariş güncelleme",
  },
  create_shipment: {
    approvalLevel: 2,
    endpoint: "/api/admin/orders",
    method: "POST",
    pathParam: "id",
    description: "Kargo oluştur",
  },
  process_refund: {
    approvalLevel: 3,
    endpoint: "/api/admin/orders",
    method: "POST",
    pathParam: "id",
    description: "İade işlemi",
  },

  // ── Kategori 4: Fatura ──
  get_invoices: {
    approvalLevel: 1,
    endpoint: "/api/admin/invoices",
    method: "GET",
    description: "Fatura listesi",
  },
  create_invoice: {
    approvalLevel: 2,
    endpoint: "/api/admin/orders",
    method: "POST",
    pathParam: "id",
    description: "E-fatura kes",
  },

  // ── Kategori 5: Bayi Yönetimi ──
  get_dealers: {
    approvalLevel: 1,
    endpoint: "/api/admin/dealers",
    method: "GET",
    description: "Bayi listesi",
  },
  get_dealer: {
    approvalLevel: 1,
    endpoint: "/api/admin/dealers",
    method: "GET",
    pathParam: "id",
    description: "Bayi detayı",
  },
  create_dealer: {
    approvalLevel: 2,
    endpoint: "/api/admin/dealers",
    method: "POST",
    description: "Yeni bayi ekle",
  },
  update_dealer: {
    approvalLevel: 2,
    endpoint: "/api/admin/dealers",
    method: "PUT",
    pathParam: "id",
    description: "Bayi güncelle",
  },
  delete_dealer: {
    approvalLevel: 3,
    endpoint: "/api/admin/dealers",
    method: "DELETE",
    pathParam: "id",
    description: "Bayi sil",
  },
  get_dealer_orders: {
    approvalLevel: 1,
    endpoint: "/api/admin/dealers",
    method: "GET",
    pathParam: "id",
    description: "Bayi sipariş geçmişi",
  },
  get_dealer_payments: {
    approvalLevel: 1,
    endpoint: "/api/admin/dealers",
    method: "GET",
    pathParam: "id",
    description: "Bayi cari hareketleri",
  },
  create_dealer_payment: {
    approvalLevel: 2,
    endpoint: "/api/admin/dealers",
    method: "POST",
    pathParam: "id",
    description: "Bayi ödeme kaydı",
  },
  get_dealer_tiers: {
    approvalLevel: 1,
    endpoint: "/api/admin/dealers/tiers",
    method: "GET",
    description: "Bayi seviye listesi",
  },
  manage_dealer_tiers: {
    approvalLevel: 2,
    endpoint: "/api/admin/dealers/tiers",
    method: "POST",
    description: "Bayi seviyesi yönet",
  },
  get_pricing_matrix: {
    approvalLevel: 1,
    endpoint: "/api/admin/pricing",
    method: "GET",
    description: "Fiyatlandırma matrisi — ürünler, bayiler ve toptan fiyatlar",
  },
  update_pricing_matrix: {
    approvalLevel: 2,
    endpoint: "/api/admin/pricing",
    method: "PATCH",
    description: "Toplu/tekil ürün-bayi fiyat güncelle (prices[] dizisi veya tekil upsert)",
  },

  // ── Genel: AI Görsel Üretim ──
  generate_image: {
    approvalLevel: 1,
    endpoint: "/api/admin/generate-image",
    method: "POST",
    description: "AI ile görsel üret (blog, ürün, banner vb.)",
  },

  // ── Kategori 6: Blog ──
  get_blog_posts: {
    approvalLevel: 1,
    endpoint: "/api/admin/blog",
    method: "GET",
    description: "Blog yazıları listesi",
  },
  create_blog_post: {
    approvalLevel: 2,
    endpoint: "/api/admin/blog",
    method: "POST",
    description: "Blog yazısı oluştur",
  },
  update_blog_post: {
    approvalLevel: 2,
    endpoint: "/api/admin/blog",
    method: "PUT",
    pathParam: "id",
    description: "Blog yazısı güncelle",
  },
  delete_blog_post: {
    approvalLevel: 3,
    endpoint: "/api/admin/blog",
    method: "DELETE",
    pathParam: "id",
    description: "Blog yazısı sil",
  },

  // ── Kategori 7: Sayfalar ──
  get_pages: {
    approvalLevel: 1,
    endpoint: "/api/admin/pages",
    method: "GET",
    description: "Sadece DB CMS sayfaları (statik sayfalar için get_seo_status kullan)",
  },
  create_page: {
    approvalLevel: 2,
    endpoint: "/api/admin/pages",
    method: "POST",
    description: "Sayfa oluştur",
  },
  update_page: {
    approvalLevel: 2,
    endpoint: "/api/admin/pages",
    method: "PUT",
    pathParam: "id",
    description: "Sayfa güncelle",
  },
  delete_page: {
    approvalLevel: 3,
    endpoint: "/api/admin/pages",
    method: "DELETE",
    pathParam: "id",
    description: "Sayfa sil",
  },

  // ── Kategori 8: Slider & Banner ──
  manage_sliders: {
    approvalLevel: 2,
    endpoint: "/api/admin/sliders",
    method: "POST",
    description: "Slider yönet",
  },
  manage_banners: {
    approvalLevel: 2,
    endpoint: "/api/admin/banners",
    method: "POST",
    description: "Banner yönet",
  },

  // ── Kategori 9: Kupon & Kampanya ──
  get_coupons: {
    approvalLevel: 1,
    endpoint: "/api/admin/coupons",
    method: "GET",
    description: "Kupon listesi",
  },
  create_coupon: {
    approvalLevel: 2,
    endpoint: "/api/admin/coupons",
    method: "POST",
    description: "Kupon oluştur",
  },
  update_coupon: {
    approvalLevel: 2,
    endpoint: "/api/admin/coupons",
    method: "PUT",
    pathParam: "id",
    description: "Kupon güncelle",
  },
  delete_coupon: {
    approvalLevel: 3,
    endpoint: "/api/admin/coupons",
    method: "DELETE",
    pathParam: "id",
    description: "Kupon sil",
  },

  // ── Kategori 10: Üretim ──
  get_production_orders: {
    approvalLevel: 1,
    endpoint: "/api/admin/production",
    method: "GET",
    description: "Üretim emirleri listesi",
  },
  create_production_order: {
    approvalLevel: 2,
    endpoint: "/api/admin/production",
    method: "POST",
    description: "Üretim emri oluştur",
  },
  update_production_order: {
    approvalLevel: 2,
    endpoint: "/api/admin/production",
    method: "PUT",
    pathParam: "id",
    description: "Üretim durumu güncelle",
  },

  // ── Kategori 11: E-posta & Mesajlar ──
  get_email_templates: {
    approvalLevel: 1,
    endpoint: "/api/admin/email-templates",
    method: "GET",
    description: "E-posta şablonları listesi",
  },
  update_email_template: {
    approvalLevel: 2,
    endpoint: "/api/admin/email-templates",
    method: "POST",
    description: "Şablon düzenle/oluştur",
  },
  delete_email_template: {
    approvalLevel: 3,
    endpoint: "/api/admin/email-templates",
    method: "DELETE",
    pathParam: "id",
    description: "E-posta şablonu sil",
  },
  preview_email_template: {
    approvalLevel: 1,
    endpoint: "/api/admin/email-templates/preview",
    method: "POST",
    description: "E-posta şablonu önizleme (örnek verilerle)",
  },
  send_test_email: {
    approvalLevel: 2,
    endpoint: "/api/admin/email-templates/test",
    method: "POST",
    description: "Test e-postası gönder",
  },
  get_email_log: {
    approvalLevel: 1,
    endpoint: "/api/admin/email-log",
    method: "GET",
    description: "E-posta gönderim log'u",
  },
  get_messages: {
    approvalLevel: 1,
    endpoint: "/api/admin/messages",
    method: "GET",
    description: "İletişim mesajları",
  },
  reply_message: {
    approvalLevel: 2,
    endpoint: "/api/admin/messages",
    method: "PUT",
    pathParam: "id",
    description: "Mesaj yanıtla",
  },

  // ── Kategori 12: SEO & Merchant ──
  get_seo_status: {
    approvalLevel: 1,
    endpoint: "/api/admin/seo",
    method: "GET",
    description: "Komple SEO durum raporu (ürünler, bloglar, sayfalar + statik sayfalar, yönlendirmeler, 404 logları)",
  },
  bulk_update_seo: {
    approvalLevel: 2,
    endpoint: "/api/admin/seo",
    method: "POST",
    description: "Toplu SEO güncelleme",
  },
  get_merchant_status: {
    approvalLevel: 1,
    endpoint: "/api/admin/merchant",
    method: "GET",
    description: "Merchant feed durumu",
  },
  sync_merchant: {
    approvalLevel: 2,
    endpoint: "/api/admin/merchant",
    method: "POST",
    description: "Merchant senkronizasyon",
  },

  // ── Kategori 13: Müşteri & Yorumlar ──
  get_customers: {
    approvalLevel: 1,
    endpoint: "/api/admin/users",
    method: "GET",
    description: "Müşteri listesi",
  },
  get_reviews: {
    approvalLevel: 1,
    endpoint: "/api/admin/reviews",
    method: "GET",
    description: "Ürün yorumları",
  },
  moderate_review: {
    approvalLevel: 2,
    endpoint: "/api/admin/reviews",
    method: "PUT",
    description: "Yorum onayla/reddet",
  },
  delete_review: {
    approvalLevel: 3,
    endpoint: "/api/admin/reviews",
    method: "DELETE",
    // NOT: pathParam yok — id query param, special route ile hallediliyor
    description: "Yorum sil",
  },

  // ── Kategori 14: Kullanıcı Yönetimi ──
  get_admin_users: {
    approvalLevel: 1,
    endpoint: "/api/admin/users",
    method: "GET",
    description: "Admin kullanıcı listesi",
  },
  create_admin_user: {
    approvalLevel: 3,
    endpoint: "/api/admin/users",
    method: "POST",
    description: "Admin kullanıcı ekle",
  },
  update_admin_user: {
    approvalLevel: 3,
    endpoint: "/api/admin/users",
    method: "PUT",
    pathParam: "id",
    description: "Kullanıcı güncelle",
  },
  delete_admin_user: {
    approvalLevel: 3,
    endpoint: "/api/admin/users",
    method: "DELETE",
    pathParam: "id",
    description: "Kullanıcı sil",
  },

  // ── Kategori 15: Chat Monitör ──
  get_chat_sessions: {
    approvalLevel: 1,
    endpoint: "/api/admin/chat",
    method: "GET",
    description: "Müşteri chat oturumları",
  },
  manage_chat: {
    approvalLevel: 2,
    endpoint: "/api/admin/chat",
    method: "PUT",
    pathParam: "id",
    description: "Chat müdahale/kapat",
  },
  delete_chat: {
    approvalLevel: 3,
    endpoint: "/api/admin/chat",
    method: "DELETE",
    pathParam: "id",
    description: "Chat sil",
  },

  // ── Kategori 16: Bildirimler ──
  get_notifications: {
    approvalLevel: 1,
    endpoint: "/api/admin/notifications",
    method: "GET",
    description: "Bildirim listesi",
  },
  mark_notifications_read: {
    approvalLevel: 1,
    endpoint: "/api/admin/notifications/read-all",
    method: "POST",
    description: "Bildirimleri okundu işaretle",
  },

  // ── Kategori 17: Ayarlar ──
  get_settings: {
    approvalLevel: 1,
    endpoint: "/api/admin/settings",
    method: "GET",
    description: "Tüm site ayarları",
  },
  update_settings: {
    approvalLevel: 2,
    endpoint: "/api/admin/settings",
    method: "PUT",
    description: "Ayarları güncelle",
  },
};

// ─── FUNCTION DECLARATIONS ───────────────────────────────────
// Gemini Native Function Calling için 67 tool tanımı

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const agentFunctionDeclarations: FunctionDeclaration[] = ([
  // ════════════════════════════════════════════════════════════
  // KATEGORİ 1: DASHBOARD & RAPORLAR (4 tool)
  // ════════════════════════════════════════════════════════════
  {
    name: "get_dashboard",
    description:
      "Dashboard istatistiklerini ve özet bilgileri getir. Toplam ciro, sipariş sayısı, bekleyen siparişler, stok uyarıları gibi bilgileri döner.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: "get_reports",
    description:
      "Satış, sipariş ve kâr raporlarını dönem bazlı getir. Bugün, bu hafta, bu ay, bu yıl veya özel tarih aralığı seçilebilir.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        period: {
          type: SchemaType.STRING,
          description:
            "Rapor dönemi: today (bugün), week (bu hafta), month (bu ay), year (bu yıl), custom (özel tarih)",
          enum: ["today", "week", "month", "year", "custom"],
        },
        startDate: {
          type: SchemaType.STRING,
          description:
            "Özel tarih aralığı başlangıcı (YYYY-MM-DD formatında). Sadece period=custom ise kullanılır.",
        },
        endDate: {
          type: SchemaType.STRING,
          description:
            "Özel tarih aralığı bitişi (YYYY-MM-DD formatında). Sadece period=custom ise kullanılır.",
        },
      },
    },
  },
  {
    name: "calculate_cost",
    description:
      "Belirli bir ürünün maliyet hesaplamasını yap. Hammadde, işçilik, genel gider, ambalaj maliyetlerini hesaplar ve kâr marjını gösterir.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        productId: {
          type: SchemaType.STRING,
          description: "Maliyet hesaplanacak ürünün ID'si",
        },
      },
      required: ["productId"],
    },
  },
  {
    name: "save_cost",
    description:
      "Ürün maliyet kaydı oluştur veya güncelle. Hammadde, işçilik, genel gider ve ambalaj maliyetlerini kaydet.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        productId: {
          type: SchemaType.STRING,
          description: "Ürün ID'si",
        },
        materialCost: {
          type: SchemaType.NUMBER,
          description: "Hammadde maliyeti (TL)",
        },
        laborCost: {
          type: SchemaType.NUMBER,
          description: "İşçilik maliyeti (TL)",
        },
        overheadCost: {
          type: SchemaType.NUMBER,
          description: "Genel gider maliyeti (TL)",
        },
        packagingCost: {
          type: SchemaType.NUMBER,
          description: "Ambalaj maliyeti (TL)",
        },
        notes: {
          type: SchemaType.STRING,
          description: "Maliyet notu (opsiyonel)",
        },
      },
      required: [
        "productId",
        "materialCost",
        "laborCost",
        "overheadCost",
        "packagingCost",
      ],
    },
  },

  // ════════════════════════════════════════════════════════════
  // KATEGORİ 2: ÜRÜN YÖNETİMİ (6 tool)
  // ════════════════════════════════════════════════════════════
  {
    name: "get_products",
    description:
      "Ürün listesini filtre, arama ve sayfalama ile getir. Stok durumu, kategori ve aktiflik filtreleri destekler.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        search: {
          type: SchemaType.STRING,
          description: "Ürün adı veya SKU ile arama",
        },
        category: {
          type: SchemaType.STRING,
          description: "Kategori ID'sine göre filtrele",
        },
        status: {
          type: SchemaType.STRING,
          description: "Ürün durumu filtresi",
          enum: ["active", "inactive"],
        },
        stockStatus: {
          type: SchemaType.STRING,
          description:
            "Stok durumu: in_stock (stokta), low (azalmış), out (tükenmiş)",
          enum: ["in_stock", "low", "out"],
        },
        page: {
          type: SchemaType.NUMBER,
          description: "Sayfa numarası (varsayılan: 1)",
        },
        limit: {
          type: SchemaType.NUMBER,
          description: "Sayfa başına kayıt (varsayılan: 20)",
        },
      },
    },
  },
  {
    name: "get_product",
    description:
      "Tek bir ürünün detayını getir. Varyasyonlar, stok bilgisi, fiyatlar, SEO bilgileri ve görselleri içerir. ID veya slug ile çalışır.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        id: {
          type: SchemaType.STRING,
          description: "Ürün ID'si (CUID) veya slug'ı (örn: 'erkek-modal-boxer-siyah'). Her ikisi de kabul edilir.",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "create_product",
    description:
      "Yeni ürün oluştur. İsim, kategori, cinsiyet, fiyat ve varyasyonlar (renk/beden/stok/SKU) gereklidir.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        name: {
          type: SchemaType.STRING,
          description: "Ürün adı (örn: 'Vorte Erkek Boxer Premium Bambu')",
        },
        categoryId: {
          type: SchemaType.STRING,
          description: "Kategori ID'si",
        },
        gender: {
          type: SchemaType.STRING,
          description: "Cinsiyet: ERKEK veya KADIN",
          enum: ["ERKEK", "KADIN"],
        },
        basePrice: {
          type: SchemaType.NUMBER,
          description: "Taban fiyat (TL)",
        },
        costPrice: {
          type: SchemaType.NUMBER,
          description: "Maliyet fiyatı (TL, opsiyonel)",
        },
        weight: {
          type: SchemaType.NUMBER,
          description: "Ağırlık (gram, kargo hesabı için)",
        },
        description: {
          type: SchemaType.STRING,
          description: "Ürün açıklaması — DÜZ METİN. HTML/Markdown YASAK. SATIR DÜZENİ KRİTİK: Bölüm başlıkları (BÜYÜK HARF) öncesi ve sonrası \\n\\n koy. TEKNİK ÖZELLİKLER ve BAKIM maddelerinde her '* •' maddesini AYRI SATIRDA yaz (\\n ile ayır), tek satıra yapıştırma! SSS'de her soru-cevap \\n\\n ile ayır. BEDEN REHBERİ tek satırda. REFERANS ŞABLONU takip et.",
        },
        images: {
          type: SchemaType.ARRAY,
          description: "Ürün görsel URL'leri",
          items: { type: SchemaType.STRING },
        },
        seoTitle: {
          type: SchemaType.STRING,
          description: "SEO başlığı (max 60 karakter)",
        },
        seoDescription: {
          type: SchemaType.STRING,
          description: "SEO açıklaması (max 160 karakter)",
        },
        googleCategory: {
          type: SchemaType.STRING,
          description:
            "Google Merchant kategori kodu (örn: 'Apparel & Accessories > Clothing > Underwear')",
        },
        variants: {
          type: SchemaType.ARRAY,
          description:
            "Ürün varyasyonları (renk × beden kombinasyonları). Her varyasyonda renk, beden, SKU ve stok zorunlu.",
          items: {
            type: SchemaType.OBJECT,
            properties: {
              color: {
                type: SchemaType.STRING,
                description: "Renk adı (Türkçe: Siyah, Beyaz, Lacivert vb.)",
              },
              colorHex: {
                type: SchemaType.STRING,
                description: "Renk HEX kodu (#000000 formatında)",
              },
              size: {
                type: SchemaType.STRING,
                description: "Beden",
                enum: ["S", "M", "L", "XL", "XXL"],
              },
              sku: {
                type: SchemaType.STRING,
                description:
                  "Stok kodu (örn: VRT-EB-SYH-M → Vorte Erkek Boxer Siyah M)",
              },
              gtinBarcode: {
                type: SchemaType.STRING,
                description: "GS1 GTIN barkod numarası (opsiyonel)",
              },
              stock: {
                type: SchemaType.NUMBER,
                description: "Stok adedi",
              },
              price: {
                type: SchemaType.NUMBER,
                description:
                  "Varyasyona özel fiyat (opsiyonel, boşsa basePrice kullanılır)",
              },
            },
            required: ["color", "colorHex", "size", "sku", "stock"],
          },
        },
      },
      required: ["name", "categoryId", "gender", "basePrice", "variants"],
    },
  },
  {
    name: "update_product",
    description:
      "Mevcut ürünü güncelle. Sadece değiştirilmek istenen alanlar gönderilir. ÖNEMLİ: id parametresine ürünün gerçek veritabanı ID'sini VEYA slug'ını yazabilirsin. Birden fazla ürün güncellemek için bu tool'u her ürün için AYRI AYRI çağır.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        id: {
          type: SchemaType.STRING,
          description: "Güncellenecek ürünün veritabanı ID'si (CUID) veya slug'ı. Önce get_products ile ürün listesini çekip doğru ID/slug'ı bul.",
        },
        name: {
          type: SchemaType.STRING,
          description: "Yeni ürün adı",
        },
        categoryId: {
          type: SchemaType.STRING,
          description: "Yeni kategori ID'si",
        },
        gender: {
          type: SchemaType.STRING,
          description: "Cinsiyet",
          enum: ["ERKEK", "KADIN"],
        },
        basePrice: {
          type: SchemaType.NUMBER,
          description: "Yeni taban fiyat (TL)",
        },
        costPrice: {
          type: SchemaType.NUMBER,
          description: "Yeni maliyet fiyatı (TL)",
        },
        weight: {
          type: SchemaType.NUMBER,
          description: "Yeni ağırlık (gram)",
        },
        description: {
          type: SchemaType.STRING,
          description: "Ürün açıklaması — DÜZ METİN. HTML/Markdown YASAK. SATIR DÜZENİ KRİTİK: Bölüm başlıkları (BÜYÜK HARF) öncesi ve sonrası \\n\\n koy. TEKNİK ÖZELLİKLER ve BAKIM maddelerinde her '* •' maddesini AYRI SATIRDA yaz (\\n ile ayır), tek satıra yapıştırma! SSS'de her soru-cevap \\n\\n ile ayır. BEDEN REHBERİ tek satırda. REFERANS ŞABLONU takip et.",
        },
        seoTitle: {
          type: SchemaType.STRING,
          description: "Yeni SEO başlığı",
        },
        seoDescription: {
          type: SchemaType.STRING,
          description: "Yeni SEO açıklaması",
        },
        active: {
          type: SchemaType.BOOLEAN,
          description: "Ürün aktif/pasif durumu",
        },
        images: {
          type: SchemaType.ARRAY,
          description:
            "Ürün görselleri URL dizisi. Örnek: ['/uploads/products/erkek-boxer-gri-1-123.png', '/uploads/products/erkek-boxer-gri-2-456.png']. Görselleri generate_image tool'u ile üretip URL'leri bu diziye ekle.",
          items: {
            type: SchemaType.STRING,
          },
        },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_product",
    description:
      "Ürünü sil. Bu işlem geri alınamaz! Ürüne ait tüm varyasyonlar da silinir.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        id: {
          type: SchemaType.STRING,
          description: "Silinecek ürün ID'si",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "get_categories",
    description:
      "Tüm ürün kategorilerini getir. Kategori adı, slug ve ürün sayılarını içerir.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },

  // ════════════════════════════════════════════════════════════
  // KATEGORİ 3: SİPARİŞ YÖNETİMİ (7 tool)
  // ════════════════════════════════════════════════════════════
  {
    name: "get_orders",
    description:
      "Sipariş listesini filtre ve sıralama ile getir. Durum, tip (perakende/toptan), tarih aralığı ve arama destekler.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        status: {
          type: SchemaType.STRING,
          description: "Sipariş durumu filtresi",
          enum: [
            "PENDING",
            "PAID",
            "PREPARING",
            "SHIPPED",
            "DELIVERED",
            "CANCELLED",
            "REFUNDED",
          ],
        },
        type: {
          type: SchemaType.STRING,
          description: "Sipariş tipi: RETAIL (perakende) veya WHOLESALE (toptan/bayi)",
          enum: ["RETAIL", "WHOLESALE"],
        },
        search: {
          type: SchemaType.STRING,
          description: "Sipariş no, müşteri adı veya e-posta ile arama",
        },
        dateFrom: {
          type: SchemaType.STRING,
          description: "Başlangıç tarihi (YYYY-MM-DD)",
        },
        dateTo: {
          type: SchemaType.STRING,
          description: "Bitiş tarihi (YYYY-MM-DD)",
        },
        sort: {
          type: SchemaType.STRING,
          description: "Sıralama: newest (en yeni), oldest (en eski), amount (tutara göre)",
          enum: ["newest", "oldest", "amount"],
        },
        page: {
          type: SchemaType.NUMBER,
          description: "Sayfa numarası",
        },
      },
    },
  },
  {
    name: "get_order",
    description:
      "Tek bir siparişin tam detayını getir. Ürünler, ödeme, kargo, fatura ve durum geçmişi dahil.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        id: {
          type: SchemaType.STRING,
          description: "Sipariş ID'si veya sipariş numarası (VRT-YYMMDD-XXXX)",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "update_order",
    description:
      "Sipariş durumunu güncelle. Kargo bilgisi ve not eklenebilir.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        id: {
          type: SchemaType.STRING,
          description: "Sipariş ID'si",
        },
        status: {
          type: SchemaType.STRING,
          description: "Yeni sipariş durumu",
          enum: [
            "PENDING",
            "PAID",
            "PREPARING",
            "SHIPPED",
            "DELIVERED",
            "CANCELLED",
            "REFUNDED",
          ],
        },
        cargoProvider: {
          type: SchemaType.STRING,
          description: "Kargo firması adı",
        },
        trackingNumber: {
          type: SchemaType.STRING,
          description: "Kargo takip numarası",
        },
        note: {
          type: SchemaType.STRING,
          description: "Durum değişikliği notu",
        },
      },
      required: ["id", "status"],
    },
  },
  {
    name: "delete_order",
    description:
      "Siparişi sil. Sadece iptal edilmiş, iade edilmiş veya başarısız ödeme durumundaki siparişler silinebilir. Bu işlem geri alınamaz!",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        id: {
          type: SchemaType.STRING,
          description: "Silinecek sipariş ID'si",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "batch_update_orders",
    description:
      "Birden fazla siparişi toplu güncelle. Toplu durum değişikliği, toplu kargolama veya toplu silme yapılabilir.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        orderIds: {
          type: SchemaType.ARRAY,
          description: "Güncellenecek sipariş ID'leri listesi",
          items: { type: SchemaType.STRING },
        },
        action: {
          type: SchemaType.STRING,
          description:
            "Toplu işlem türü: status_update (durum güncelle), ship (kargola), invoice (fatura kes), delete (sil)",
          enum: ["status_update", "ship", "invoice", "delete"],
        },
        status: {
          type: SchemaType.STRING,
          description: "Yeni durum (sadece status_update işlemi için)",
        },
      },
      required: ["orderIds", "action"],
    },
  },
  {
    name: "create_shipment",
    description:
      "Geliver API üzerinden kargo oluştur. Sipariş otomatik olarak 'Kargoya Verildi' durumuna geçer ve müşteriye bildirim gönderilir.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        orderId: {
          type: SchemaType.STRING,
          description: "Kargoya verilecek sipariş ID'si",
        },
      },
      required: ["orderId"],
    },
  },
  {
    name: "process_refund",
    description:
      "İade işlemi başlat. Tam iade veya ürün bazlı kısmi iade yapılabilir. iyzico üzerinden otomatik iade işlenir ve stok güncellenir.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        orderId: {
          type: SchemaType.STRING,
          description: "İade edilecek sipariş ID'si",
        },
        items: {
          type: SchemaType.ARRAY,
          description:
            "İade edilecek ürünler (boş bırakılırsa tam iade). Her öğede orderItemId ve miktar belirtilir.",
          items: {
            type: SchemaType.OBJECT,
            properties: {
              orderItemId: {
                type: SchemaType.STRING,
                description: "Sipariş kalemi ID'si",
              },
              quantity: {
                type: SchemaType.NUMBER,
                description: "İade miktarı",
              },
            },
            required: ["orderItemId", "quantity"],
          },
        },
        reason: {
          type: SchemaType.STRING,
          description: "İade nedeni",
        },
      },
      required: ["orderId"],
    },
  },

  // ════════════════════════════════════════════════════════════
  // KATEGORİ 4: FATURA (2 tool)
  // ════════════════════════════════════════════════════════════
  {
    name: "get_invoices",
    description:
      "Fatura listesini getir. Durum, tarih ve müşteri bazlı filtreleme destekler.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        status: {
          type: SchemaType.STRING,
          description: "Fatura durumu filtresi",
          enum: ["PENDING", "CREATED", "SENT", "CANCELLED"],
        },
        search: {
          type: SchemaType.STRING,
          description: "Fatura no veya müşteri ile arama",
        },
        page: {
          type: SchemaType.NUMBER,
          description: "Sayfa numarası",
        },
      },
    },
  },
  {
    name: "create_invoice",
    description:
      "DIA CRM API üzerinden e-fatura (e-arşiv fatura) kes. Siparişe ait tüm bilgiler otomatik alınır.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        orderId: {
          type: SchemaType.STRING,
          description: "Fatura kesilecek sipariş ID'si",
        },
      },
      required: ["orderId"],
    },
  },

  // ════════════════════════════════════════════════════════════
  // KATEGORİ 5: BAYİ YÖNETİMİ (11 tool)
  // ════════════════════════════════════════════════════════════
  {
    name: "get_dealers",
    description:
      "Bayi listesini getir. Durum, seviye ve arama filtreleri destekler.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        status: {
          type: SchemaType.STRING,
          description: "Bayi durumu",
          enum: ["ACTIVE", "PENDING", "SUSPENDED"],
        },
        search: {
          type: SchemaType.STRING,
          description: "Bayi adı, kodu veya firma adı ile arama",
        },
        tier: {
          type: SchemaType.STRING,
          description: "Bayi seviyesi filtresi",
        },
      },
    },
  },
  {
    name: "get_dealer",
    description:
      "Tek bayinin detayını getir. İletişim bilgileri, iskonto oranı, cari bakiye, seviye ve sipariş istatistikleri dahil.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        id: {
          type: SchemaType.STRING,
          description: "Bayi ID'si veya bayi kodu (örn: BAY-SHELL01)",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "create_dealer",
    description:
      "Yeni bayi ekle. Bayi kodu, firma bilgileri, iletişim ve başlangıç iskonto oranı gereklidir.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        code: {
          type: SchemaType.STRING,
          description: "Bayi kodu (benzersiz, örn: BAY-SHELL02)",
        },
        companyName: {
          type: SchemaType.STRING,
          description: "Firma/mağaza adı",
        },
        contactName: {
          type: SchemaType.STRING,
          description: "Yetkili kişi adı",
        },
        email: {
          type: SchemaType.STRING,
          description: "E-posta adresi",
        },
        phone: {
          type: SchemaType.STRING,
          description: "Telefon numarası",
        },
        address: {
          type: SchemaType.STRING,
          description: "Adres",
        },
        city: {
          type: SchemaType.STRING,
          description: "Şehir",
        },
        taxNumber: {
          type: SchemaType.STRING,
          description: "Vergi numarası",
        },
        taxOffice: {
          type: SchemaType.STRING,
          description: "Vergi dairesi",
        },
        discountRate: {
          type: SchemaType.NUMBER,
          description: "İskonto oranı (% olarak, örn: 30)",
        },
        password: {
          type: SchemaType.STRING,
          description: "Bayi portal şifresi",
        },
      },
      required: ["code", "companyName", "contactName", "email", "phone", "password"],
    },
  },
  {
    name: "update_dealer",
    description:
      "Bayi bilgilerini güncelle. İskonto oranı, seviye, durum (aktif/askıda) değiştirilebilir.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        id: {
          type: SchemaType.STRING,
          description: "Bayi ID'si",
        },
        companyName: { type: SchemaType.STRING, description: "Firma adı" },
        contactName: { type: SchemaType.STRING, description: "Yetkili adı" },
        email: { type: SchemaType.STRING, description: "E-posta" },
        phone: { type: SchemaType.STRING, description: "Telefon" },
        address: { type: SchemaType.STRING, description: "Adres" },
        city: { type: SchemaType.STRING, description: "Şehir" },
        discountRate: {
          type: SchemaType.NUMBER,
          description: "Yeni iskonto oranı (%)",
        },
        status: {
          type: SchemaType.STRING,
          description: "Bayi durumu",
          enum: ["ACTIVE", "PENDING", "SUSPENDED"],
        },
        tierId: {
          type: SchemaType.STRING,
          description: "Bayi seviye ID'si",
        },
        creditLimit: {
          type: SchemaType.NUMBER,
          description: "Kredi limiti (TL)",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_dealer",
    description:
      "Bayiyi sil. Bu işlem geri alınamaz! Bayinin tüm sipariş ve cari geçmişi korunur.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        id: {
          type: SchemaType.STRING,
          description: "Silinecek bayi ID'si",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "get_dealer_orders",
    description:
      "Belirli bayinin sipariş geçmişini getir. Tarih ve durum filtresi ile.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        id: {
          type: SchemaType.STRING,
          description: "Bayi ID'si",
        },
        status: {
          type: SchemaType.STRING,
          description: "Sipariş durumu filtresi",
        },
        page: {
          type: SchemaType.NUMBER,
          description: "Sayfa numarası",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "get_dealer_payments",
    description:
      "Bayinin cari hesap hareketlerini getir. Ödemeler, borçlar, bakiye bilgisi.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        id: {
          type: SchemaType.STRING,
          description: "Bayi ID'si",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "create_dealer_payment",
    description:
      "Bayi cari hesabına ödeme kaydı gir. Nakit, havale veya çek ödemesi olabilir.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        id: {
          type: SchemaType.STRING,
          description: "Bayi ID'si",
        },
        amount: {
          type: SchemaType.NUMBER,
          description: "Ödeme tutarı (TL)",
        },
        type: {
          type: SchemaType.STRING,
          description: "Ödeme tipi",
          enum: ["CASH", "BANK_TRANSFER", "CHECK"],
        },
        description: {
          type: SchemaType.STRING,
          description: "Ödeme açıklaması",
        },
        date: {
          type: SchemaType.STRING,
          description: "Ödeme tarihi (YYYY-MM-DD)",
        },
      },
      required: ["id", "amount", "type"],
    },
  },
  {
    name: "get_dealer_tiers",
    description:
      "Bayi seviye listesini getir. Her seviyenin iskonto oranı ve minimum sipariş tutarını gösterir.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: "manage_dealer_tiers",
    description:
      "Bayi seviyesi ekle, güncelle veya sil. Seviye adı, iskonto oranı ve minimum sipariş tutarı belirlenir.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        action: {
          type: SchemaType.STRING,
          description: "İşlem türü",
          enum: ["create", "update", "delete"],
        },
        id: {
          type: SchemaType.STRING,
          description: "Seviye ID'si (update/delete için)",
        },
        name: {
          type: SchemaType.STRING,
          description: "Seviye adı (örn: Gold, Silver, Bronze)",
        },
        discountRate: {
          type: SchemaType.NUMBER,
          description: "İskonto oranı (%)",
        },
        minOrderAmount: {
          type: SchemaType.NUMBER,
          description: "Minimum sipariş tutarı (TL)",
        },
      },
      required: ["action"],
    },
  },
  {
    name: "get_pricing_matrix",
    description:
      "Mevcut fiyatlandırma matrisini getir. Ürünler, bayiler ve toptan fiyatları döner. Fiyat güncellemeden ÖNCE mevcut fiyatları görmek için kullan.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: "update_pricing_matrix",
    description:
      "Bayi fiyat matrisini güncelle. TEKİL veya TOPLU fiyat ayarla. Birden fazla ürün/bayi fiyatı ayarlarken 'prices' dizisini kullan — her seferinde tek çağrı yeterli!",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        prices: {
          type: SchemaType.ARRAY,
          description:
            "TOPLU fiyat güncelleme: birden fazla ürün/bayi fiyatını tek seferde ayarla. Her eleman { productId, dealerId?, wholesalePrice } içermeli.",
          items: {
            type: SchemaType.OBJECT,
            properties: {
              productId: {
                type: SchemaType.STRING,
                description: "Ürün ID'si",
              },
              dealerId: {
                type: SchemaType.STRING,
                description: "Bayi ID'si (bayiye özel fiyat için, genel toptan için gönderme)",
              },
              wholesalePrice: {
                type: SchemaType.NUMBER,
                description: "Toptan fiyat (TL)",
              },
            },
            required: ["productId", "wholesalePrice"],
          },
        },
        productId: {
          type: SchemaType.STRING,
          description: "TEKİL mod: Ürün ID'si (tek fiyat güncellemesi için)",
        },
        dealerId: {
          type: SchemaType.STRING,
          description: "Bayi ID'si (bayiye özel fiyat için)",
        },
        wholesalePrice: {
          type: SchemaType.NUMBER,
          description: "Toptan fiyat (TL)",
        },
      },
    },
  },

  // ════════════════════════════════════════════════════════════
  // GENEL: AI GÖRSEL ÜRETİM
  // ════════════════════════════════════════════════════════════
  {
    name: "generate_image",
    description:
      "AI ile görsel üret (blog kapağı, ürün fotoğrafı, banner vb.). Görsel üretilir, dosya sistemine kaydedilir ve URL döner. Her çağrıda 1 görsel üretilir. Birden fazla görsel için birden fazla kez çağır.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        prompt: {
          type: SchemaType.STRING,
          description:
            "Görsel üretim promptu. İngilizce olmalı. E-ticaret ürün fotoğrafı örnek: 'Product photography of men's gray boxer briefs on invisible mannequin, front view, pure white background, professional e-commerce style, sharp focus, 8k quality'. Blog kapak örnek: 'Professional photo of modal fabric clothing, soft texture, eco-friendly textile'",
        },
        filename: {
          type: SchemaType.STRING,
          description:
            "Dosya adı (slug formatında, uzantısız). Örnek: 'erkek-boxer-gri-1' veya 'modal-kumasin-faydalari'",
        },
        directory: {
          type: SchemaType.STRING,
          description:
            "Kayıt dizini: 'products' (ürün görselleri), 'blog' (blog kapak görselleri), 'sliders' (slider görselleri) veya 'banners' (banner görselleri). Varsayılan: 'blog'",
        },
      },
      required: ["prompt", "filename"],
    },
  },

  // ════════════════════════════════════════════════════════════
  // KATEGORİ 6: BLOG (4 tool)
  // ════════════════════════════════════════════════════════════
  {
    name: "get_blog_posts",
    description:
      "Blog yazılarını listele. Yayın durumu ve arama filtresi destekler.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        published: {
          type: SchemaType.BOOLEAN,
          description: "Yayın durumu filtresi: true (yayında), false (taslak)",
        },
        search: {
          type: SchemaType.STRING,
          description: "Başlık veya içerik araması",
        },
        page: {
          type: SchemaType.NUMBER,
          description: "Sayfa numarası",
        },
      },
    },
  },
  {
    name: "create_blog_post",
    description:
      "Yeni blog yazısı oluştur. Başlık, içerik (HTML), özet, etiketler ve SEO bilgileri gereklidir. Varsayılan olarak taslak olarak kaydedilir.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        title: {
          type: SchemaType.STRING,
          description: "Blog yazısı başlığı",
        },
        slug: {
          type: SchemaType.STRING,
          description:
            "URL slug'ı (türkçe-kucuk-harf-tire-ile, otomatik oluşturulabilir)",
        },
        content: {
          type: SchemaType.STRING,
          description: "Blog yazısı içeriği (HTML formatında)",
        },
        excerpt: {
          type: SchemaType.STRING,
          description: "Kısa özet (listeleme sayfasında gösterilir, max 200 karakter)",
        },
        coverImage: {
          type: SchemaType.STRING,
          description: "Kapak görseli URL'si",
        },
        tags: {
          type: SchemaType.STRING,
          description: "Etiketler (virgülle ayrılmış: 'erkek boxer, iç giyim, bambu')",
        },
        seoTitle: {
          type: SchemaType.STRING,
          description: "SEO başlığı (max 60 karakter)",
        },
        seoDescription: {
          type: SchemaType.STRING,
          description: "SEO meta açıklaması (max 160 karakter)",
        },
        published: {
          type: SchemaType.BOOLEAN,
          description: "Yayın durumu: true (yayınla), false (taslak). Varsayılan: false",
        },
      },
      required: ["title", "content"],
    },
  },
  {
    name: "update_blog_post",
    description:
      "Mevcut blog yazısını güncelle. Sadece değiştirilmek istenen alanlar gönderilir. Taslağı yayınlamak için published: true gönderin.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        id: {
          type: SchemaType.STRING,
          description: "Blog yazısı ID'si",
        },
        title: { type: SchemaType.STRING, description: "Yeni başlık" },
        slug: { type: SchemaType.STRING, description: "Yeni slug" },
        content: { type: SchemaType.STRING, description: "Yeni içerik (HTML)" },
        excerpt: { type: SchemaType.STRING, description: "Yeni özet" },
        coverImage: { type: SchemaType.STRING, description: "Yeni kapak görseli" },
        tags: { type: SchemaType.STRING, description: "Yeni etiketler" },
        seoTitle: { type: SchemaType.STRING, description: "Yeni SEO başlığı" },
        seoDescription: { type: SchemaType.STRING, description: "Yeni SEO açıklaması" },
        published: { type: SchemaType.BOOLEAN, description: "Yayın durumu" },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_blog_post",
    description: "Blog yazısını sil. Bu işlem geri alınamaz!",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        id: {
          type: SchemaType.STRING,
          description: "Silinecek blog yazısı ID'si",
        },
      },
      required: ["id"],
    },
  },

  // ════════════════════════════════════════════════════════════
  // KATEGORİ 7: SAYFALAR (4 tool)
  // ════════════════════════════════════════════════════════════
  {
    name: "get_pages",
    description:
      "Sadece veritabanındaki CMS sayfalarını getirir. NOT: Hakkımızda, İletişim, KVKK, SSS gibi hardcoded statik sayfalar burada GÖRÜNMEZ. Tüm sayfaların SEO durumunu görmek için get_seo_status kullan!",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        search: {
          type: SchemaType.STRING,
          description: "Sayfa başlığı araması",
        },
      },
    },
  },
  {
    name: "create_page",
    description:
      "Yeni statik sayfa oluştur. Başlık, slug ve HTML içerik gereklidir.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        title: {
          type: SchemaType.STRING,
          description: "Sayfa başlığı",
        },
        slug: {
          type: SchemaType.STRING,
          description: "URL slug'ı",
        },
        content: {
          type: SchemaType.STRING,
          description: "Sayfa içeriği (HTML)",
        },
        seoTitle: {
          type: SchemaType.STRING,
          description: "SEO başlığı",
        },
        seoDescription: {
          type: SchemaType.STRING,
          description: "SEO açıklaması",
        },
        published: {
          type: SchemaType.BOOLEAN,
          description: "Yayın durumu",
        },
      },
      required: ["title", "content"],
    },
  },
  {
    name: "update_page",
    description: "Mevcut sayfayı güncelle.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        id: { type: SchemaType.STRING, description: "Sayfa ID'si" },
        title: { type: SchemaType.STRING, description: "Yeni başlık" },
        slug: { type: SchemaType.STRING, description: "Yeni slug" },
        content: { type: SchemaType.STRING, description: "Yeni içerik (HTML)" },
        seoTitle: { type: SchemaType.STRING, description: "Yeni SEO başlığı" },
        seoDescription: { type: SchemaType.STRING, description: "Yeni SEO açıklaması" },
        published: { type: SchemaType.BOOLEAN, description: "Yayın durumu" },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_page",
    description: "Sayfayı sil. Bu işlem geri alınamaz!",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        id: { type: SchemaType.STRING, description: "Silinecek sayfa ID'si" },
      },
      required: ["id"],
    },
  },

  // ════════════════════════════════════════════════════════════
  // KATEGORİ 8: SLİDER & BANNER (2 tool)
  // ════════════════════════════════════════════════════════════
  {
    name: "manage_sliders",
    description:
      "Slider CRUD işlemleri. Ana sayfa slider'larını listele, oluştur, güncelle veya sil. Masaüstü (1920×800) ve mobil (768×600) görselleri ayrı ayarlanır. Görselleri generate_image tool'u ile directory='sliders' olarak üretip URL'leri desktopImage/mobileImage alanlarına ekle.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        action: {
          type: SchemaType.STRING,
          description: "İşlem türü",
          enum: ["list", "create", "update", "delete"],
        },
        id: {
          type: SchemaType.STRING,
          description: "Slider ID'si (update/delete için)",
        },
        title: { type: SchemaType.STRING, description: "Slider başlığı" },
        subtitle: { type: SchemaType.STRING, description: "Alt başlık" },
        highlightText: { type: SchemaType.STRING, description: "Vurgulanan metin" },
        description: { type: SchemaType.STRING, description: "Açıklama" },
        desktopImage: {
          type: SchemaType.STRING,
          description: "Masaüstü görseli URL'si (1920×800)",
        },
        mobileImage: {
          type: SchemaType.STRING,
          description: "Mobil görseli URL'si (768×600)",
        },
        primaryButtonText: { type: SchemaType.STRING, description: "Ana buton metni" },
        primaryButtonLink: { type: SchemaType.STRING, description: "Ana buton linki" },
        secondaryButtonText: { type: SchemaType.STRING, description: "İkinci buton metni" },
        secondaryButtonLink: { type: SchemaType.STRING, description: "İkinci buton linki" },
        startDate: { type: SchemaType.STRING, description: "Başlangıç tarihi" },
        endDate: { type: SchemaType.STRING, description: "Bitiş tarihi" },
        active: { type: SchemaType.BOOLEAN, description: "Aktif durumu" },
      },
      required: ["action"],
    },
  },
  {
    name: "manage_banners",
    description:
      "Banner CRUD işlemleri. Promosyon banner'larını listele, oluştur, güncelle veya sil. Görselleri generate_image tool'u ile directory='banners' olarak üretip URL'leri image (desktop) ve mobileImage (mobil) alanlarına ekle.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        action: {
          type: SchemaType.STRING,
          description: "İşlem türü",
          enum: ["list", "create", "update", "delete"],
        },
        id: {
          type: SchemaType.STRING,
          description: "Banner ID'si (update/delete için)",
        },
        title: { type: SchemaType.STRING, description: "Banner adı (name)" },
        image: { type: SchemaType.STRING, description: "Desktop görsel URL'si (1200×400)" },
        mobileImage: { type: SchemaType.STRING, description: "Mobil görsel URL'si (768×400)" },
        link: { type: SchemaType.STRING, description: "Tıklama linki" },
        altText: { type: SchemaType.STRING, description: "Görsel alt metni (erişilebilirlik)" },
        position: {
          type: SchemaType.STRING,
          description: "Pozisyon: homepage-top, homepage-mid, homepage-bottom, category-top, product-sidebar, checkout",
        },
        sortOrder: { type: SchemaType.NUMBER, description: "Sıralama (0'dan başlar)" },
        startDate: { type: SchemaType.STRING, description: "Başlangıç tarihi (ISO)" },
        endDate: { type: SchemaType.STRING, description: "Bitiş tarihi (ISO)" },
        active: { type: SchemaType.BOOLEAN, description: "Aktif durumu" },
      },
      required: ["action"],
    },
  },

  // ════════════════════════════════════════════════════════════
  // KATEGORİ 9: KUPON & KAMPANYA (4 tool)
  // ════════════════════════════════════════════════════════════
  {
    name: "get_coupons",
    description:
      "Kupon ve kampanya listesini getir. Aktif, süresi dolmuş ve kullanım sayısı bilgilerini içerir.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        status: {
          type: SchemaType.STRING,
          description: "Kupon durumu",
          enum: ["active", "expired", "disabled"],
        },
        search: {
          type: SchemaType.STRING,
          description: "Kupon kodu veya kampanya adı araması",
        },
      },
    },
  },
  {
    name: "create_coupon",
    description:
      "Yeni kupon / kampanya oluştur. 6 kampanya türü destekler: GENERAL (genel), FREE_SHIPPING (ücretsiz kargo), BUY_X_PAY_Y (X al Y öde), FIRST_ORDER (ilk sipariş), PRODUCT_BASED (ürün bazlı), CATEGORY_BASED (kategori bazlı).",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        code: {
          type: SchemaType.STRING,
          description: "Kupon kodu (benzersiz, büyük harf, örn: YAZ2026)",
        },
        campaignName: {
          type: SchemaType.STRING,
          description: "Kampanya adı",
        },
        campaignType: {
          type: SchemaType.STRING,
          description: "Kampanya türü",
          enum: [
            "GENERAL",
            "FREE_SHIPPING",
            "BUY_X_PAY_Y",
            "FIRST_ORDER",
            "PRODUCT_BASED",
            "CATEGORY_BASED",
          ],
        },
        discountType: {
          type: SchemaType.STRING,
          description: "İndirim tipi: PERCENTAGE (yüzde) veya FIXED (sabit TL)",
          enum: ["PERCENTAGE", "FIXED"],
        },
        discountValue: {
          type: SchemaType.NUMBER,
          description: "İndirim değeri (% veya TL)",
        },
        buyQuantity: {
          type: SchemaType.NUMBER,
          description: "X al Y öde kampanyasında: kaç ürün alınsın",
        },
        payQuantity: {
          type: SchemaType.NUMBER,
          description: "X al Y öde kampanyasında: kaç ürün ödensin",
        },
        minAmount: {
          type: SchemaType.NUMBER,
          description: "Minimum sepet tutarı (TL)",
        },
        maxUsage: {
          type: SchemaType.NUMBER,
          description: "Maksimum toplam kullanım sayısı",
        },
        perUserLimit: {
          type: SchemaType.NUMBER,
          description: "Kişi başı kullanım limiti",
        },
        startDate: {
          type: SchemaType.STRING,
          description: "Kampanya başlangıç tarihi (YYYY-MM-DD)",
        },
        endDate: {
          type: SchemaType.STRING,
          description: "Kampanya bitiş tarihi (YYYY-MM-DD)",
        },
        orderScope: {
          type: SchemaType.STRING,
          description: "Geçerli olduğu sipariş tipi",
          enum: ["ALL", "RETAIL", "WHOLESALE"],
        },
        freeShipping: {
          type: SchemaType.BOOLEAN,
          description: "Ücretsiz kargo dahil mi?",
        },
        description: {
          type: SchemaType.STRING,
          description: "Kampanya açıklaması",
        },
      },
      required: [
        "code",
        "campaignName",
        "campaignType",
        "discountType",
        "discountValue",
        "startDate",
        "endDate",
      ],
    },
  },
  {
    name: "update_coupon",
    description: "Kuponu güncelle. Sadece değiştirilen alanlar gönderilir.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        id: { type: SchemaType.STRING, description: "Kupon ID'si" },
        code: { type: SchemaType.STRING, description: "Yeni kupon kodu" },
        campaignName: { type: SchemaType.STRING, description: "Yeni kampanya adı" },
        discountType: {
          type: SchemaType.STRING,
          enum: ["PERCENTAGE", "FIXED"],
        },
        discountValue: { type: SchemaType.NUMBER, description: "Yeni indirim değeri" },
        minAmount: { type: SchemaType.NUMBER, description: "Yeni minimum tutar" },
        maxUsage: { type: SchemaType.NUMBER, description: "Yeni max kullanım" },
        startDate: { type: SchemaType.STRING, description: "Yeni başlangıç tarihi" },
        endDate: { type: SchemaType.STRING, description: "Yeni bitiş tarihi" },
        active: { type: SchemaType.BOOLEAN, description: "Kupon aktif/pasif" },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_coupon",
    description: "Kuponu sil. Bu işlem geri alınamaz!",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        id: { type: SchemaType.STRING, description: "Silinecek kupon ID'si" },
      },
      required: ["id"],
    },
  },

  // ════════════════════════════════════════════════════════════
  // KATEGORİ 10: ÜRETİM (3 tool)
  // ════════════════════════════════════════════════════════════
  {
    name: "get_production_orders",
    description:
      "Üretim emirlerini listele. Durum ve öncelik bazlı filtreleme destekler.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        status: {
          type: SchemaType.STRING,
          description: "Üretim durumu filtresi",
          enum: [
            "PLANNED",
            "CUTTING",
            "SEWING",
            "QUALITY",
            "PACKAGING",
            "COMPLETED",
          ],
        },
        priority: {
          type: SchemaType.STRING,
          description: "Öncelik filtresi",
          enum: ["LOW", "NORMAL", "HIGH", "URGENT"],
        },
      },
    },
  },
  {
    name: "create_production_order",
    description:
      "Yeni üretim emri oluştur. Ürün, varyasyon dağılımı (renk×beden×adet), hedef tarih ve öncelik belirtilir.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        productId: {
          type: SchemaType.STRING,
          description: "Üretilecek ürün ID'si",
        },
        variants: {
          type: SchemaType.ARRAY,
          description:
            "Üretim varyasyon dağılımı (renk/beden/miktar)",
          items: {
            type: SchemaType.OBJECT,
            properties: {
              color: { type: SchemaType.STRING, description: "Renk" },
              size: { type: SchemaType.STRING, description: "Beden" },
              quantity: { type: SchemaType.NUMBER, description: "Adet" },
            },
            required: ["color", "size", "quantity"],
          },
        },
        targetDate: {
          type: SchemaType.STRING,
          description: "Hedef tamamlanma tarihi (YYYY-MM-DD)",
        },
        priority: {
          type: SchemaType.STRING,
          description: "Öncelik seviyesi",
          enum: ["LOW", "NORMAL", "HIGH", "URGENT"],
        },
        materialCost: {
          type: SchemaType.NUMBER,
          description: "Tahmini hammadde maliyeti (TL)",
        },
        laborCost: {
          type: SchemaType.NUMBER,
          description: "Tahmini işçilik maliyeti (TL)",
        },
        notes: {
          type: SchemaType.STRING,
          description: "Üretim notları",
        },
      },
      required: ["productId", "variants", "targetDate", "priority"],
    },
  },
  {
    name: "update_production_order",
    description:
      "Üretim emri durumunu güncelle. Aşama ilerletme (Kesim → Dikim → Kalite → Paketleme → Tamamlandı) veya öncelik/tarih değişikliği.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        id: {
          type: SchemaType.STRING,
          description: "Üretim emri ID'si",
        },
        status: {
          type: SchemaType.STRING,
          description: "Yeni üretim durumu",
          enum: [
            "PLANNED",
            "CUTTING",
            "SEWING",
            "QUALITY",
            "PACKAGING",
            "COMPLETED",
          ],
        },
        note: {
          type: SchemaType.STRING,
          description: "Durum değişikliği notu",
        },
        priority: {
          type: SchemaType.STRING,
          description: "Yeni öncelik",
          enum: ["LOW", "NORMAL", "HIGH", "URGENT"],
        },
        targetDate: {
          type: SchemaType.STRING,
          description: "Yeni hedef tarih (YYYY-MM-DD)",
        },
      },
      required: ["id"],
    },
  },

  // ════════════════════════════════════════════════════════════
  // KATEGORİ 11: E-POSTA & MESAJLAR (5 tool)
  // ════════════════════════════════════════════════════════════
  {
    name: "get_email_templates",
    description:
      "E-posta şablonlarını listele. Sipariş onay, kargo bilgilendirme, hoş geldin vb. şablonlar.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        type: {
          type: SchemaType.STRING,
          description: "Şablon türü filtresi",
          enum: [
            "ORDER_CONFIRMATION",
            "SHIPPING_NOTIFICATION",
            "WELCOME",
            "PASSWORD_RESET",
            "REVIEW_REQUEST",
            "DEALER_WELCOME",
          ],
        },
      },
    },
  },
  {
    name: "update_email_template",
    description:
      "E-posta şablonu oluştur veya güncelle. Konu, HTML içerik ve değişkenler ayarlanır. Değişkenler: {{customerName}}, {{orderNumber}}, {{totalAmount}}, {{trackingNo}}, {{carrier}}, {{invoiceNo}}, {{resetUrl}}, {{companyName}}, {{dealerCode}}, {{loginUrl}}, {{refundAmount}} vb. Görsel eklemek için önce generate_image tool'unu directory='emails' ile çağır, dönen URL'yi <img> tag'i ile HTML'e ekle.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        type: {
          type: SchemaType.STRING,
          description: "Şablon adı (slug format)",
          enum: [
            "order-confirmation",
            "payment-success",
            "shipping-notification",
            "delivery-notification",
            "refund-confirmation",
            "welcome",
            "password-reset",
            "dealer-approved",
            "invoice",
            "newsletter",
          ],
        },
        subject: {
          type: SchemaType.STRING,
          description: "E-posta konusu (değişken desteği: {{orderNumber}})",
        },
        htmlContent: {
          type: SchemaType.STRING,
          description: "E-posta HTML içeriği (değişken desteği). Tam HTML şablon olmalı.",
        },
        fromAddress: {
          type: SchemaType.STRING,
          description: "Gönderici adresi override (opsiyonel). Örnek: siparis@vorte.com.tr",
        },
        active: {
          type: SchemaType.BOOLEAN,
          description: "Şablon aktif mi?",
        },
      },
      required: ["type", "subject", "htmlContent"],
    },
  },
  {
    name: "delete_email_template",
    description:
      "E-posta şablonunu sil. Silinen şablon yerine hardcoded varsayılan şablon kullanılır. Önce get_email_templates ile ID'yi al.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        id: {
          type: SchemaType.STRING,
          description: "Silinecek şablonun ID'si",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "preview_email_template",
    description:
      "E-posta şablonunu örnek verilerle önizle. Şablondaki {{değişkenler}} test verileriyle doldurulur ve HTML döner. FROM adresi de gösterilir.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        templateName: {
          type: SchemaType.STRING,
          description: "Şablon adı",
          enum: [
            "order-confirmation",
            "payment-success",
            "shipping-notification",
            "delivery-notification",
            "refund-confirmation",
            "welcome",
            "password-reset",
            "dealer-approved",
            "invoice",
            "newsletter",
          ],
        },
      },
      required: ["templateName"],
    },
  },
  {
    name: "send_test_email",
    description:
      "Bir e-posta şablonunu test olarak belirtilen adrese gönder. Şablon örnek verilerle doldurularak gönderilir. Test sonucu email log'da görünür.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        templateName: {
          type: SchemaType.STRING,
          description: "Şablon adı",
          enum: [
            "order-confirmation",
            "payment-success",
            "shipping-notification",
            "delivery-notification",
            "refund-confirmation",
            "welcome",
            "password-reset",
            "dealer-approved",
            "invoice",
            "newsletter",
          ],
        },
        to: {
          type: SchemaType.STRING,
          description: "Test e-postası gönderilecek adres",
        },
      },
      required: ["templateName", "to"],
    },
  },
  {
    name: "get_email_log",
    description:
      "E-posta gönderim log'unu getir. Başarılı/başarısız gönderimler, tarih ve alıcı bilgisi.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        status: {
          type: SchemaType.STRING,
          description: "Gönderim durumu filtresi",
          enum: ["sent", "failed", "pending"],
        },
        search: {
          type: SchemaType.STRING,
          description: "Alıcı e-posta veya konu araması",
        },
        page: {
          type: SchemaType.NUMBER,
          description: "Sayfa numarası",
        },
      },
    },
  },
  {
    name: "get_messages",
    description:
      "İletişim formu mesajlarını getir. Okunmamış mesaj sayısı ve yanıtlanma durumu dahil.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        status: {
          type: SchemaType.STRING,
          description: "Mesaj durumu",
          enum: ["unread", "read", "replied"],
        },
        search: {
          type: SchemaType.STRING,
          description: "Gönderen adı veya mesaj içeriği araması",
        },
        page: {
          type: SchemaType.NUMBER,
          description: "Sayfa numarası",
        },
      },
    },
  },
  {
    name: "reply_message",
    description:
      "İletişim mesajını yanıtla. Yanıt e-posta ile gönderilir.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        id: {
          type: SchemaType.STRING,
          description: "Mesaj ID'si",
        },
        reply: {
          type: SchemaType.STRING,
          description: "Yanıt metni",
        },
      },
      required: ["id", "reply"],
    },
  },

  // ════════════════════════════════════════════════════════════
  // KATEGORİ 12: SEO & MERCHANT (4 tool)
  // ════════════════════════════════════════════════════════════
  {
    name: "get_seo_status",
    description:
      "Komple SEO durum raporu getir. Ürün SEO (seoTitle, seoDescription, googleCategory), Blog SEO, Sayfa SEO (DB sayfaları + hardcoded statik sayfalar: hakkımızda, iletişim, kvkk, sss vb. 10 sayfa), yönlendirmeler ve 404 loglarını döndürür. SEO bölümü incelemek veya sayfa SEO durumunu kontrol etmek için BU TOOL'U KULLAN (get_pages değil!).",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: "bulk_update_seo",
    description:
      "Toplu SEO güncelleme yap. Birden fazla ürün veya sayfanın meta title ve meta description'ını tek seferde güncelle.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        items: {
          type: SchemaType.ARRAY,
          description: "Güncellenecek öğeler",
          items: {
            type: SchemaType.OBJECT,
            properties: {
              id: { type: SchemaType.STRING, description: "Ürün veya sayfa ID'si" },
              type: {
                type: SchemaType.STRING,
                description: "Öğe tipi",
                enum: ["product", "page", "blog", "category"],
              },
              seoTitle: { type: SchemaType.STRING, description: "Yeni SEO başlığı" },
              seoDescription: { type: SchemaType.STRING, description: "Yeni SEO açıklaması" },
            },
            required: ["id", "type"],
          },
        },
      },
      required: ["items"],
    },
  },
  {
    name: "get_merchant_status",
    description:
      "Google Merchant Center feed durumunu getir. Senkronize edilen ürünler, hatalar ve uyarılar.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: "sync_merchant",
    description:
      "Google Merchant Center ile ürün feed'ini senkronize et. Tüm aktif ürünler XML feed'ine eklenir.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        force: {
          type: SchemaType.BOOLEAN,
          description:
            "Zorla senkronize et (önbelleği temizle ve tüm ürünleri yeniden gönder)",
        },
      },
    },
  },

  // ════════════════════════════════════════════════════════════
  // KATEGORİ 13: MÜŞTERİ & YORUMLAR (4 tool)
  // ════════════════════════════════════════════════════════════
  {
    name: "get_customers",
    description:
      "Müşteri listesini getir. Kayıt tarihi, sipariş sayısı ve toplam harcama bilgileri dahil.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        search: {
          type: SchemaType.STRING,
          description: "Ad, soyad veya e-posta ile arama",
        },
        sort: {
          type: SchemaType.STRING,
          description: "Sıralama",
          enum: ["newest", "oldest", "most_orders", "most_spent"],
        },
        page: {
          type: SchemaType.NUMBER,
          description: "Sayfa numarası",
        },
      },
    },
  },
  {
    name: "get_reviews",
    description:
      "Ürün yorumlarını getir. Onay durumu, puan ve ürün bazlı filtreleme destekler.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        status: {
          type: SchemaType.STRING,
          description: "Yorum durumu",
          enum: ["PENDING", "APPROVED", "REJECTED"],
        },
        productId: {
          type: SchemaType.STRING,
          description: "Ürün ID'sine göre filtrele",
        },
        rating: {
          type: SchemaType.NUMBER,
          description: "Puan filtresi (1-5)",
        },
        page: {
          type: SchemaType.NUMBER,
          description: "Sayfa numarası",
        },
      },
    },
  },
  {
    name: "moderate_review",
    description:
      "Yorumu onayla veya reddet. Onaylanan yorumlar ürün sayfasında görünür.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        id: {
          type: SchemaType.STRING,
          description: "Yorum ID'si",
        },
        action: {
          type: SchemaType.STRING,
          description: "Moderasyon kararı",
          enum: ["approve", "reject"],
        },
        rejectReason: {
          type: SchemaType.STRING,
          description: "Reddetme nedeni (reject seçilirse)",
        },
      },
      required: ["id", "action"],
    },
  },
  {
    name: "delete_review",
    description: "Yorumu kalıcı olarak sil. Bu işlem geri alınamaz!",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        id: {
          type: SchemaType.STRING,
          description: "Silinecek yorum ID'si",
        },
      },
      required: ["id"],
    },
  },

  // ════════════════════════════════════════════════════════════
  // KATEGORİ 14: KULLANICI YÖNETİMİ (4 tool)
  // ════════════════════════════════════════════════════════════
  {
    name: "get_admin_users",
    description:
      "Admin, editör ve görüntüleyici kullanıcı listesini getir. Rol ve yetki bilgileri dahil.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        role: {
          type: SchemaType.STRING,
          description: "Rol filtresi",
          enum: ["ADMIN", "EDITOR", "VIEWER"],
        },
      },
    },
  },
  {
    name: "create_admin_user",
    description:
      "Yeni admin paneli kullanıcısı ekle. Rol ve detaylı yetki ataması yapılır. KRİTİK İŞLEM!",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        name: {
          type: SchemaType.STRING,
          description: "Kullanıcı adı",
        },
        email: {
          type: SchemaType.STRING,
          description: "E-posta adresi",
        },
        password: {
          type: SchemaType.STRING,
          description: "Şifre (min 6 karakter)",
        },
        role: {
          type: SchemaType.STRING,
          description: "Kullanıcı rolü",
          enum: ["ADMIN", "EDITOR", "VIEWER"],
        },
        permissions: {
          type: SchemaType.OBJECT,
          description:
            "Özel yetki ataması. Kaynak: products/orders/dealers/invoices/settings/users/sliders/banners/coupons/reports. Değer: r (okuma), w (yazma), d (silme) kombinasyonu.",
          properties: {
            products: { type: SchemaType.STRING },
            orders: { type: SchemaType.STRING },
            dealers: { type: SchemaType.STRING },
            invoices: { type: SchemaType.STRING },
            settings: { type: SchemaType.STRING },
            users: { type: SchemaType.STRING },
            sliders: { type: SchemaType.STRING },
            banners: { type: SchemaType.STRING },
            coupons: { type: SchemaType.STRING },
            reports: { type: SchemaType.STRING },
          },
        },
      },
      required: ["name", "email", "password", "role"],
    },
  },
  {
    name: "update_admin_user",
    description:
      "Admin kullanıcıyı güncelle. Rol, yetki veya durum değişikliği yapılabilir. KRİTİK İŞLEM!",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        id: { type: SchemaType.STRING, description: "Kullanıcı ID'si" },
        name: { type: SchemaType.STRING, description: "Yeni ad" },
        role: {
          type: SchemaType.STRING,
          description: "Yeni rol",
          enum: ["ADMIN", "EDITOR", "VIEWER"],
        },
        active: { type: SchemaType.BOOLEAN, description: "Aktif/pasif" },
        permissions: {
          type: SchemaType.OBJECT,
          description: "Yeni yetki ataması",
          properties: {
            products: { type: SchemaType.STRING },
            orders: { type: SchemaType.STRING },
            dealers: { type: SchemaType.STRING },
            invoices: { type: SchemaType.STRING },
            settings: { type: SchemaType.STRING },
            users: { type: SchemaType.STRING },
            sliders: { type: SchemaType.STRING },
            banners: { type: SchemaType.STRING },
            coupons: { type: SchemaType.STRING },
            reports: { type: SchemaType.STRING },
          },
        },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_admin_user",
    description:
      "Admin kullanıcıyı sil. Bu işlem geri alınamaz! KRİTİK İŞLEM!",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        id: { type: SchemaType.STRING, description: "Silinecek kullanıcı ID'si" },
      },
      required: ["id"],
    },
  },

  // ════════════════════════════════════════════════════════════
  // KATEGORİ 15: CHAT MONİTÖR (3 tool)
  // ════════════════════════════════════════════════════════════
  {
    name: "get_chat_sessions",
    description:
      "Müşteri chat oturumlarını listele. Aktif/kapanmış oturumlar ve mesaj sayısı.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        status: {
          type: SchemaType.STRING,
          description: "Oturum durumu",
          enum: ["active", "closed"],
        },
        search: {
          type: SchemaType.STRING,
          description: "Müşteri adı veya mesaj içeriği araması",
        },
        page: {
          type: SchemaType.NUMBER,
          description: "Sayfa numarası",
        },
      },
    },
  },
  {
    name: "manage_chat",
    description:
      "Chat oturumunu yönet: mesaj gönder (admin müdahalesi), oturumu kapat.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        id: {
          type: SchemaType.STRING,
          description: "Chat oturumu ID'si",
        },
        action: {
          type: SchemaType.STRING,
          description: "İşlem türü",
          enum: ["send_message", "close"],
        },
        message: {
          type: SchemaType.STRING,
          description: "Admin mesajı (send_message için)",
        },
      },
      required: ["id", "action"],
    },
  },
  {
    name: "delete_chat",
    description:
      "Chat oturumunu ve tüm mesajlarını sil. Bu işlem geri alınamaz!",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        id: {
          type: SchemaType.STRING,
          description: "Silinecek chat oturumu ID'si",
        },
      },
      required: ["id"],
    },
  },

  // ════════════════════════════════════════════════════════════
  // KATEGORİ 16: BİLDİRİMLER (2 tool)
  // ════════════════════════════════════════════════════════════
  {
    name: "get_notifications",
    description:
      "Bildirim listesini ve okunmamış bildirim sayısını getir.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        unreadOnly: {
          type: SchemaType.BOOLEAN,
          description: "Sadece okunmamış bildirimleri getir",
        },
        type: {
          type: SchemaType.STRING,
          description: "Bildirim türü filtresi",
          enum: ["order", "stock", "review", "dealer", "system"],
        },
        page: {
          type: SchemaType.NUMBER,
          description: "Sayfa numarası",
        },
      },
    },
  },
  {
    name: "mark_notifications_read",
    description:
      "Tüm bildirimleri okundu olarak işaretle.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },

  // ════════════════════════════════════════════════════════════
  // KATEGORİ 17: AYARLAR (2 tool)
  // ════════════════════════════════════════════════════════════
  {
    name: "get_settings",
    description:
      "Tüm site ayarlarını getir. 7 sekme: Genel, SEO, Entegrasyonlar, AI Chatbot, Sosyal Medya, E-posta (SMTP), Kargo.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: "update_settings",
    description:
      "Site ayarlarını güncelle. Sadece değiştirilecek alanlar gönderilir. Mevcut ayarları bozmaz.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        // Genel
        siteName: { type: SchemaType.STRING, description: "Site adı" },
        siteUrl: { type: SchemaType.STRING, description: "Site URL'si" },
        siteDescription: { type: SchemaType.STRING, description: "Site açıklaması" },
        contactEmail: { type: SchemaType.STRING, description: "İletişim e-postası" },
        contactPhone: { type: SchemaType.STRING, description: "İletişim telefonu" },
        contactAddress: { type: SchemaType.STRING, description: "Adres" },
        logoUrl: { type: SchemaType.STRING, description: "Logo URL'si" },
        logoDarkUrl: { type: SchemaType.STRING, description: "Koyu tema logosu URL'si" },
        faviconUrl: { type: SchemaType.STRING, description: "Favicon URL'si" },
        ogImageUrl: { type: SchemaType.STRING, description: "OG Image URL'si" },
        freeShippingThreshold: {
          type: SchemaType.NUMBER,
          description: "Ücretsiz kargo limiti (TL)",
        },
        defaultShippingCost: {
          type: SchemaType.NUMBER,
          description: "Varsayılan kargo ücreti (TL)",
        },
        // SEO
        metaTitle: { type: SchemaType.STRING, description: "Ana sayfa meta başlığı" },
        metaDescription: { type: SchemaType.STRING, description: "Ana sayfa meta açıklaması" },
        metaKeywords: { type: SchemaType.STRING, description: "Meta anahtar kelimeler" },
        googleVerificationCode: {
          type: SchemaType.STRING,
          description: "Google Search Console doğrulama kodu",
        },
        // Entegrasyonlar
        googleAnalyticsId: { type: SchemaType.STRING, description: "Google Analytics ID" },
        googleAdsCode: { type: SchemaType.STRING, description: "Google Ads kodu" },
        googleMerchantId: { type: SchemaType.STRING, description: "Google Merchant Center ID" },
        facebookPixelId: { type: SchemaType.STRING, description: "Facebook Pixel ID" },
        iyzicoApiKey: { type: SchemaType.STRING, description: "iyzico API anahtarı" },
        geliverApiKey: { type: SchemaType.STRING, description: "Geliver API anahtarı" },
        // AI Chatbot
        aiEnabled: { type: SchemaType.BOOLEAN, description: "AI chatbot aktif mi?" },
        aiModel: { type: SchemaType.STRING, description: "AI model adı" },
        aiSystemPrompt: { type: SchemaType.STRING, description: "AI sistem promptu" },
        aiRules: { type: SchemaType.STRING, description: "AI kuralları" },
        // Sosyal Medya
        instagramUrl: { type: SchemaType.STRING, description: "Instagram URL" },
        facebookUrl: { type: SchemaType.STRING, description: "Facebook URL" },
        twitterUrl: { type: SchemaType.STRING, description: "Twitter/X URL" },
        tiktokUrl: { type: SchemaType.STRING, description: "TikTok URL" },
        youtubeUrl: { type: SchemaType.STRING, description: "YouTube URL" },
        // E-posta (SMTP)
        smtpHost: { type: SchemaType.STRING, description: "SMTP sunucu adresi" },
        smtpPort: { type: SchemaType.NUMBER, description: "SMTP port numarası" },
        smtpUser: { type: SchemaType.STRING, description: "SMTP kullanıcı adı" },
        smtpPassword: { type: SchemaType.STRING, description: "SMTP şifresi" },
      },
    },
  },
] as unknown) as FunctionDeclaration[];
