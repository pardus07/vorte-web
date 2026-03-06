# VORTE ADMIN AI AGENT — Kapsamlı Uygulama Planı
## Gemini Function Calling ile Tam Admin Panel Kontrolü

**Tarih:** 5 Mart 2026
**Model:** Gemini 2.0 Flash (hızlı, ucuz, Türkçe iyi)
**Mimari:** Gemini Native Function Calling — düz metin parse DEĞİL
**Kapsam:** 25 admin bölümü, 47 API route, 82 HTTP method → 45 tool

---

## MİMARİ KARAR

```
Admin mesaj yazar
    ↓
Frontend → POST /api/admin/ai-assistant
    ↓
Backend: Gemini API çağrısı (function calling aktif, 45 tool tanımlı)
    ↓
Gemini karar verir: tool çağır VEYA düz metin yanıtla
    ↓
Tool çağrısı varsa → 3 SEVİYELİ ONAY SİSTEMİ:
    │
    ├─ SEVİYE 1 (BİLGİ): get_* tool'ları → onaysız, direkt çalıştır, sonucu göster
    │
    ├─ SEVİYE 2 (OLUŞTURMA): create_*/update_* → önizleme kartı göster → "Onayla" butonu
    │
    └─ SEVİYE 3 (KRİTİK): delete_*/refund_*/batch_* → çift onay ("Emin misin?" + "Evet, uygula")
    ↓
Onay sonrası → mevcut /api/admin/* endpoint'i çağrılır (yeni API yazılmaz!)
    ↓
Sonuç chat'e feedback olarak eklenir
```

---

## TOOL KATALOĞU — 45 TOOL (82 HTTP Method Eşleştirmesi)

### Kategori 1: Dashboard & Raporlar (4 tool)

| # | Tool Adı | Açıklama | API Endpoint | Method | Onay |
|---|----------|----------|-------------|--------|------|
| 1 | `get_dashboard` | Dashboard istatistikleri ve özet | `/api/admin/dashboard` | GET | SEVİYE 1 |
| 2 | `get_reports` | Satış, kâr, sipariş raporları (dönem bazlı) | `/api/admin/reports` | GET | SEVİYE 1 |
| 3 | `calculate_cost` | Ürün maliyet hesaplama + kâr marjı | `/api/admin/costs` | GET | SEVİYE 1 |
| 4 | `save_cost` | Maliyet kaydı oluştur | `/api/admin/costs` | POST | SEVİYE 2 |

**Parametreler:**
```
get_dashboard: {} (parametresiz)

get_reports: {
  period: "today" | "week" | "month" | "year" | "custom",
  startDate?: string,  // custom için
  endDate?: string     // custom için
}

calculate_cost: {
  productId: string
}

save_cost: {
  productId: string,
  materialCost: number,
  laborCost: number,
  overheadCost: number,
  packagingCost: number,
  notes?: string
}
```

---

### Kategori 2: Ürün Yönetimi (6 tool)

| # | Tool Adı | Açıklama | API Endpoint | Method | Onay |
|---|----------|----------|-------------|--------|------|
| 5 | `get_products` | Ürün listesi (filtre, arama, sayfalama) | `/api/admin/products` | GET | SEVİYE 1 |
| 6 | `get_product` | Tek ürün detayı | `/api/admin/products/[id]` | GET | SEVİYE 1 |
| 7 | `create_product` | Yeni ürün oluştur (varyasyonlarla) | `/api/admin/products` | POST | SEVİYE 2 |
| 8 | `update_product` | Ürün güncelle | `/api/admin/products/[id]` | PUT | SEVİYE 2 |
| 9 | `delete_product` | Ürün sil | `/api/admin/products/[id]` | DELETE | SEVİYE 3 |
| 10 | `get_categories` | Kategori listesi | `/api/admin/categories` | GET | SEVİYE 1 |

**Parametreler:**
```
get_products: {
  search?: string,
  category?: string,
  status?: "active" | "inactive",
  stockStatus?: "in_stock" | "low" | "out",
  page?: number,
  limit?: number
}

create_product: {
  name: string,
  categoryId: string,
  gender: "ERKEK" | "KADIN",
  basePrice: number,
  costPrice?: number,
  weight?: number,
  description?: string,
  images?: string[],
  seoTitle?: string,
  seoDescription?: string,
  googleCategory?: string,
  variants: [{
    color: string,
    colorHex: string,
    size: "S" | "M" | "L" | "XL" | "XXL",
    sku: string,
    gtinBarcode?: string,
    stock: number,
    price?: number
  }]
}

update_product: {
  id: string,
  // aynı alanlar, hepsi opsiyonel
}

delete_product: {
  id: string
}
```

---

### Kategori 3: Sipariş Yönetimi (7 tool)

| # | Tool Adı | Açıklama | API Endpoint | Method | Onay |
|---|----------|----------|-------------|--------|------|
| 11 | `get_orders` | Sipariş listesi (durum, tip, tarih filtresi) | `/api/admin/orders` | GET | SEVİYE 1 |
| 12 | `get_order` | Sipariş detayı | `/api/admin/orders/[id]` | GET | SEVİYE 1 |
| 13 | `update_order` | Sipariş durumu güncelle | `/api/admin/orders/[id]` | PATCH | SEVİYE 2 |
| 14 | `delete_order` | Sipariş sil | `/api/admin/orders/[id]` | DELETE | SEVİYE 3 |
| 15 | `batch_update_orders` | Toplu sipariş güncelleme | `/api/admin/orders/batch` | POST | SEVİYE 3 |
| 16 | `create_shipment` | Geliver ile kargo oluştur | `/api/admin/orders/[id]/ship` | POST | SEVİYE 2 |
| 17 | `process_refund` | İade işlemi başlat | `/api/admin/orders/[id]/refund` | POST | SEVİYE 3 |

**Parametreler:**
```
get_orders: {
  status?: "PENDING" | "PAID" | "PREPARING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "REFUNDED",
  type?: "RETAIL" | "WHOLESALE",
  search?: string,
  dateFrom?: string,
  dateTo?: string,
  sort?: "newest" | "oldest" | "amount",
  page?: number
}

update_order: {
  id: string,
  status: string,
  cargoProvider?: string,
  trackingNumber?: string,
  note?: string
}

create_shipment: {
  orderId: string
}

process_refund: {
  orderId: string,
  items?: [{ orderItemId: string, quantity: number }],  // ürün bazlı iade
  reason?: string
}

batch_update_orders: {
  orderIds: string[],
  status: string
}
```

---

### Kategori 4: Fatura (2 tool)

| # | Tool Adı | Açıklama | API Endpoint | Method | Onay |
|---|----------|----------|-------------|--------|------|
| 18 | `get_invoices` | Fatura listesi | `/api/admin/invoices` | GET | SEVİYE 1 |
| 19 | `create_invoice` | DIA CRM ile e-fatura kes | `/api/admin/orders/[id]/invoice` | POST | SEVİYE 2 |

---

### Kategori 5: Kargo (1 tool — get + ship zaten Sipariş kategorisinde)

| # | Tool Adı | Açıklama | API Endpoint | Method | Onay |
|---|----------|----------|-------------|--------|------|
| — | `get_orders` | Kargo sayfası = filtre status=SHIPPED ile sipariş listesi | Aynı endpoint | GET | SEVİYE 1 |

> Kargo için ayrı tool gerekmez. `get_orders` status="SHIPPED" filtresi ile aynı veriyi çeker.
> `create_shipment` zaten Sipariş kategorisinde tanımlı.

---

### Kategori 6: Bayi Yönetimi (8 tool)

| # | Tool Adı | Açıklama | API Endpoint | Method | Onay |
|---|----------|----------|-------------|--------|------|
| 20 | `get_dealers` | Bayi listesi | `/api/admin/dealers` | GET | SEVİYE 1 |
| 21 | `get_dealer` | Bayi detayı | `/api/admin/dealers/[id]` | GET | SEVİYE 1 |
| 22 | `create_dealer` | Yeni bayi ekle | `/api/admin/dealers` | POST | SEVİYE 2 |
| 23 | `update_dealer` | Bayi güncelle (iskonto, seviye, durum) | `/api/admin/dealers/[id]` | PUT | SEVİYE 2 |
| 24 | `delete_dealer` | Bayi sil | `/api/admin/dealers/[id]` | DELETE | SEVİYE 3 |
| 25 | `get_dealer_orders` | Bayi sipariş geçmişi | `/api/admin/dealers/[id]/orders` | GET | SEVİYE 1 |
| 26 | `get_dealer_payments` | Bayi cari hareketleri | `/api/admin/dealers/[id]/payments` | GET | SEVİYE 1 |
| 27 | `create_dealer_payment` | Bayi ödeme kaydı | `/api/admin/dealers/[id]/payments` | POST | SEVİYE 2 |

**Ek tool'lar:**

| # | Tool Adı | Açıklama | API Endpoint | Method | Onay |
|---|----------|----------|-------------|--------|------|
| 28 | `get_dealer_tiers` | Bayi seviye listesi | `/api/admin/dealers/tiers` | GET | SEVİYE 1 |
| 29 | `manage_dealer_tiers` | Seviye ekle/sil | `/api/admin/dealers/tiers` | POST/DELETE | SEVİYE 2 |
| 30 | `update_pricing_matrix` | Fiyat matrisi güncelle | `/api/admin/pricing` | PUT | SEVİYE 2 |

---

### Kategori 7: İçerik Yönetimi — Blog (4 tool)

| # | Tool Adı | Açıklama | API Endpoint | Method | Onay |
|---|----------|----------|-------------|--------|------|
| 31 | `get_blog_posts` | Blog yazıları listesi | `/api/admin/blog` | GET | SEVİYE 1 |
| 32 | `create_blog_post` | Blog yazısı oluştur | `/api/admin/blog` | POST | SEVİYE 2 |
| 33 | `update_blog_post` | Blog yazısı güncelle | `/api/admin/blog/[id]` | PUT | SEVİYE 2 |
| 34 | `delete_blog_post` | Blog yazısı sil | `/api/admin/blog/[id]` | DELETE | SEVİYE 3 |

**Özel Davranış — Blog Oluşturma Akışı:**
```
Admin: "Erkek boxer için SEO blog yazısı yaz"
    ↓
Gemini SORULAR SORAR (tool çağırmaz, metin döner):
  - Konu odağı ne? (kumaş tipi, bakım, beden seçimi, trend?)
  - Hedef kitle? (toptan müşteri, perakende müşteri, genel?)
  - Kumaş tipi? (pamuk, modal, bambu, karışım?)
  - Ton? (bilgilendirici, satış odaklı, eğlenceli?)
  - Görsel eklensin mi?
    ↓
Admin cevaplar
    ↓
Gemini create_blog_post tool'unu çağırır:
{
  title: "Erkek Boxer Seçerken Dikkat Edilmesi Gereken 5 Önemli Kriter",
  slug: "erkek-boxer-secerken-dikkat-edilmesi-gerekenler",
  content: "<h2>1. Kumaş Kalitesi</h2><p>Bambu kumaş...</p>...",
  excerpt: "Doğru erkek boxer seçimi konfor ve sağlık için...",
  tags: "erkek boxer, iç giyim, bambu kumaş, beden seçimi",
  seoTitle: "Erkek Boxer Nasıl Seçilir? 2026 Rehberi | Vorte Tekstil",
  seoDescription: "Erkek boxer seçerken kumaş, beden ve model...",
  published: false  // TASLAK olarak oluştur — admin onayı bekle
}
    ↓
Frontend: Önizleme kartı gösterir (başlık, özet, HTML render)
  [Önizle] [Düzenle] [Taslak Kaydet] [Yayınla]
    ↓
Admin "Yayınla" → update_blog_post(id, published: true)
```

---

### Kategori 8: İçerik Yönetimi — Sayfalar (4 tool)

| # | Tool Adı | Açıklama | API Endpoint | Method | Onay |
|---|----------|----------|-------------|--------|------|
| 35 | `get_pages` | Sayfa listesi | `/api/admin/pages` | GET | SEVİYE 1 |
| 36 | `create_page` | Sayfa oluştur | `/api/admin/pages` | POST | SEVİYE 2 |
| 37 | `update_page` | Sayfa güncelle | `/api/admin/pages/[id]` | PUT | SEVİYE 2 |
| 38 | `delete_page` | Sayfa sil | `/api/admin/pages/[id]` | DELETE | SEVİYE 3 |

---

### Kategori 9: Slider & Banner (4 tool)

| # | Tool Adı | Açıklama | API Endpoint | Method | Onay |
|---|----------|----------|-------------|--------|------|
| 39 | `manage_sliders` | Slider CRUD (list/create/update/delete) | `/api/admin/sliders[/id]` | ALL | SEVİYE 2 |
| 40 | `manage_banners` | Banner CRUD (list/create/update/delete) | `/api/admin/banners[/id]` | ALL | SEVİYE 2 |

**Parametreler:**
```
manage_sliders: {
  action: "list" | "create" | "update" | "delete",
  id?: string,        // update/delete için
  data?: {
    title?: string,
    subtitle?: string,
    highlightText?: string,
    description?: string,
    desktopImage: string,  // 1920×800
    mobileImage: string,   // 768×600
    primaryButtonText?: string,
    primaryButtonLink?: string,
    secondaryButtonText?: string,
    secondaryButtonLink?: string,
    startDate?: string,
    endDate?: string,
    active?: boolean
  }
}
```

---

### Kategori 10: Kupon & Kampanya (3 tool)

| # | Tool Adı | Açıklama | API Endpoint | Method | Onay |
|---|----------|----------|-------------|--------|------|
| 41 | `get_coupons` | Kupon listesi | `/api/admin/coupons` | GET | SEVİYE 1 |
| 42 | `create_coupon` | Kupon oluştur | `/api/admin/coupons` | POST | SEVİYE 2 |
| 43 | `update_coupon` | Kupon güncelle/sil | `/api/admin/coupons/[id]` | PUT/PATCH/DELETE | SEVİYE 2/3 |

**6 Kampanya Türü:**
```
create_coupon: {
  code: string,
  campaignName: string,
  campaignType: "GENERAL" | "FREE_SHIPPING" | "BUY_X_PAY_Y" | "FIRST_ORDER" | "PRODUCT_BASED" | "CATEGORY_BASED",
  discountType: "PERCENTAGE" | "FIXED",
  discountValue: number,
  buyQuantity?: number,     // X al Y öde
  payQuantity?: number,     // X al Y öde
  minAmount?: number,
  maxUsage?: number,
  perUserLimit?: number,
  startDate: string,
  endDate: string,
  orderScope: "ALL" | "RETAIL" | "WHOLESALE",
  freeShipping?: boolean,
  description?: string
}
```

---

### Kategori 11: Üretim (3 tool)

| # | Tool Adı | Açıklama | API Endpoint | Method | Onay |
|---|----------|----------|-------------|--------|------|
| 44 | `get_production_orders` | Üretim emirleri listesi | `/api/admin/production` | GET | SEVİYE 1 |
| 45 | `create_production_order` | Üretim emri oluştur | `/api/admin/production` | POST | SEVİYE 2 |
| 46 | `update_production_order` | Üretim durumu güncelle | `/api/admin/production/[id]` | PUT | SEVİYE 2 |

**Parametreler:**
```
create_production_order: {
  productId: string,
  variants: [{ color: string, size: string, quantity: number }],
  targetDate: string,
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT",
  materialCost?: number,
  laborCost?: number,
  notes?: string
}

update_production_order: {
  id: string,
  status?: "PLANNED" | "CUTTING" | "SEWING" | "QUALITY" | "PACKAGING" | "COMPLETED",
  note?: string,
  priority?: string,
  targetDate?: string
}
```

---

### Kategori 12: E-posta & Mesajlar (5 tool)

| # | Tool Adı | Açıklama | API Endpoint | Method | Onay |
|---|----------|----------|-------------|--------|------|
| 47 | `get_email_templates` | E-posta şablonları listesi | `/api/admin/email-templates` | GET | SEVİYE 1 |
| 48 | `update_email_template` | Şablon düzenle/oluştur | `/api/admin/email-templates` | POST | SEVİYE 2 |
| 49 | `get_email_log` | Gönderim log'u | `/api/admin/email-log` | GET | SEVİYE 1 |
| 50 | `get_messages` | İletişim mesajları | `/api/admin/messages` | GET | SEVİYE 1 |
| 51 | `reply_message` | Mesaj yanıtla | `/api/admin/messages/[id]` | PUT | SEVİYE 2 |

---

### Kategori 13: SEO & Merchant (4 tool)

| # | Tool Adı | Açıklama | API Endpoint | Method | Onay |
|---|----------|----------|-------------|--------|------|
| 52 | `get_seo_status` | SEO durum raporu | `/api/admin/seo` | GET | SEVİYE 1 |
| 53 | `bulk_update_seo` | Toplu SEO güncelleme | `/api/admin/seo` | POST | SEVİYE 2 |
| 54 | `get_merchant_status` | Merchant feed durumu | `/api/admin/merchant` | GET | SEVİYE 1 |
| 55 | `sync_merchant` | Merchant senkronizasyon | `/api/admin/merchant` | POST | SEVİYE 2 |

---

### Kategori 14: Müşteri & Yorumlar (3 tool)

| # | Tool Adı | Açıklama | API Endpoint | Method | Onay |
|---|----------|----------|-------------|--------|------|
| 56 | `get_customers` | Müşteri listesi | `/api/admin/users` → role=CUSTOMER filtre | GET | SEVİYE 1 |
| 57 | `get_reviews` | Ürün yorumları | `/api/admin/reviews` | GET | SEVİYE 1 |
| 58 | `moderate_review` | Yorum onayla/reddet/sil | `/api/admin/reviews` | PUT/DELETE | SEVİYE 2 |

---

### Kategori 15: Kullanıcı Yönetimi (3 tool)

| # | Tool Adı | Açıklama | API Endpoint | Method | Onay |
|---|----------|----------|-------------|--------|------|
| 59 | `get_admin_users` | Admin kullanıcı listesi | `/api/admin/users` | GET | SEVİYE 1 |
| 60 | `create_admin_user` | Admin kullanıcı ekle | `/api/admin/users` | POST | SEVİYE 3 |
| 61 | `update_admin_user` | Kullanıcı güncelle/sil | `/api/admin/users/[id]` | PUT/DELETE | SEVİYE 3 |

---

### Kategori 16: Chat Monitör (2 tool)

| # | Tool Adı | Açıklama | API Endpoint | Method | Onay |
|---|----------|----------|-------------|--------|------|
| 62 | `get_chat_sessions` | Müşteri chat oturumları | `/api/admin/chat` | GET | SEVİYE 1 |
| 63 | `manage_chat` | Chat müdahale/kapat/sil | `/api/admin/chat/[id]` | PUT/DELETE | SEVİYE 2 |

---

### Kategori 17: Bildirimler (2 tool)

| # | Tool Adı | Açıklama | API Endpoint | Method | Onay |
|---|----------|----------|-------------|--------|------|
| 64 | `get_notifications` | Bildirim listesi + okunmamış sayısı | `/api/admin/notifications` | GET | SEVİYE 1 |
| 65 | `mark_notifications_read` | Bildirimleri okundu işaretle | `/api/admin/notifications/read-all` | POST | SEVİYE 1 |

---

### Kategori 18: Ayarlar (1 tool — çok amaçlı)

| # | Tool Adı | Açıklama | API Endpoint | Method | Onay |
|---|----------|----------|-------------|--------|------|
| 66 | `get_settings` | Tüm site ayarlarını getir | `/api/admin/settings` | GET | SEVİYE 1 |
| 67 | `update_settings` | Ayarları güncelle | `/api/admin/settings` | PUT | SEVİYE 2 |

**Parametreler (7 tab'ın hepsini kapsar):**
```
update_settings: {
  // Tab 1 — Genel
  siteName?: string,
  siteUrl?: string,
  siteDescription?: string,
  contactEmail?: string,
  contactPhone?: string,
  contactAddress?: string,
  logoUrl?: string,
  logoDarkUrl?: string,
  faviconUrl?: string,
  ogImageUrl?: string,
  freeShippingThreshold?: number,
  defaultShippingCost?: number,
  
  // Tab 2 — SEO
  metaTitle?: string,
  metaDescription?: string,
  metaKeywords?: string,
  googleVerificationCode?: string,
  
  // Tab 3 — Entegrasyonlar
  googleAnalyticsId?: string,
  googleAdsCode?: string,
  googleMerchantId?: string,
  facebookPixelId?: string,
  iyzicoApiKey?: string,
  geliverApiKey?: string,
  
  // Tab 4 — AI
  aiEnabled?: boolean,
  aiModel?: string,
  aiSystemPrompt?: string,
  aiRules?: string,
  
  // Tab 5 — Sosyal Medya
  instagramUrl?: string,
  facebookUrl?: string,
  twitterUrl?: string,
  tiktokUrl?: string,
  youtubeUrl?: string,
  
  // Tab 6 — Email
  smtpHost?: string,
  smtpPort?: number,
  smtpUser?: string,
  smtpPassword?: string
}
```

---

## TOPLAM: 67 TOOL — 82 HTTP METHOD KARŞILIĞI

| Onay Seviyesi | Tool Sayısı | Açıklama |
|---------------|-------------|----------|
| SEVİYE 1 (Bilgi) | 28 | Onaysız — direkt çalıştır ve göster |
| SEVİYE 2 (Oluşturma) | 27 | Önizleme + tek onay |
| SEVİYE 3 (Kritik) | 12 | Çift onay ("Emin misin?" + "Evet") |

---

## SAYFA BAĞLAMI (CONTEXT AWARENESS)

Agent bulunduğun sayfaya göre akıllı davranmalı:

```typescript
// usePathname() ile alınan sayfa bağlamı

const PAGE_CONTEXT: Record<string, ContextConfig> = {
  "/admin": {
    autoTools: ["get_dashboard"],
    shortcuts: ["Bugünkü satış ne?", "Bekleyen sipariş var mı?", "Stok uyarısı var mı?"]
  },
  "/admin/siparisler": {
    autoTools: ["get_orders"],
    shortcuts: ["Bekleyen siparişleri göster", "Bugünkü siparişler", "Toplu kargola"]
  },
  "/admin/urunler": {
    autoTools: ["get_products"],
    shortcuts: ["Yeni ürün ekle", "Stokta azalanlar", "Fiyat güncelle"]
  },
  "/admin/bayiler": {
    autoTools: ["get_dealers"],
    shortcuts: ["Bekleyen başvurular", "Cari bakiye özetleri", "Yeni bayi ekle"]
  },
  "/admin/blog": {
    autoTools: ["get_blog_posts"],
    shortcuts: ["Yeni blog yazısı oluştur", "SEO uyumlu yazı yaz", "Taslakları göster"]
  },
  "/admin/raporlar": {
    autoTools: ["get_reports"],
    shortcuts: ["Bu ayın kârı", "En çok satan ürünler", "Bayi vs perakende"]
  },
  "/admin/uretim": {
    autoTools: ["get_production_orders"],
    shortcuts: ["Aktif üretimler", "Geciken üretimler", "Yeni üretim emri"]
  },
  "/admin/kuponlar": {
    autoTools: ["get_coupons"],
    shortcuts: ["Yeni kampanya oluştur", "Aktif kuponlar", "Süresi dolanlar"]
  },
  "/admin/seo": {
    autoTools: ["get_seo_status"],
    shortcuts: ["SEO durumu", "Eksik meta tag'ler", "Toplu güncelle"]
  },
  "/admin/google-merchant": {
    autoTools: ["get_merchant_status"],
    shortcuts: ["Feed durumu", "GTIN eksikler", "Senkronize et"]
  },
  "/admin/mesajlar": {
    autoTools: ["get_messages"],
    shortcuts: ["Okunmamış mesajlar", "Yanıtlanmamış mesajlar"]
  },
  "/admin/faturalar": {
    autoTools: ["get_invoices"],
    shortcuts: ["Bekleyen faturalar", "Bugünkü faturalar"]
  },
  "/admin/ayarlar": {
    autoTools: ["get_settings"],
    shortcuts: ["SMTP ayarla", "SEO güncelle", "Logo değiştir"]
  },
  "/admin/chat": {
    autoTools: ["get_chat_sessions"],
    shortcuts: ["Aktif sohbetler", "Müdahale gereken chatler"]
  },
  "/admin/maliyet": {
    autoTools: [],
    shortcuts: ["Maliyet hesapla", "Kâr marjı analizi"]
  },
  "/admin/kullanicilar": {
    autoTools: ["get_admin_users"],
    shortcuts: ["Kullanıcı listesi", "Yeni editör ekle"]
  },
  "/admin/musteriler": {
    autoTools: ["get_customers"],
    shortcuts: ["Müşteri ara", "Engelli müşteriler"]
  },
  "/admin/email-sablonlari": {
    autoTools: ["get_email_templates"],
    shortcuts: ["Şablon düzenle", "Yeni şablon oluştur"]
  },
  "/admin/slider": {
    autoTools: [],
    shortcuts: ["Yeni slider ekle", "Slider sırasını değiştir"]
  },
  "/admin/bannerlar": {
    autoTools: [],
    shortcuts: ["Banner ekle", "Aktif bannerlar"]
  },
  "/admin/fiyatlandirma": {
    autoTools: [],
    shortcuts: ["Fiyat matrisi", "Toptan fiyat güncelle"]
  },
  "/admin/bildirimler": {
    autoTools: ["get_notifications"],
    shortcuts: ["Okunmamış bildirimler", "Tümünü okundu yap"]
  }
}
```

---

## SYSTEM PROMPT YAPISI

```
Sen Vorte Tekstil'in admin panel asistanısın. Adın "Vorte Asistan".

GÖREV: Admin paneldeki TÜM işlemleri yönetmek. Blog yazmaktan sipariş takibine,
üretim planlamadan SEO optimizasyonuna kadar her şeyi yapabilirsin.

DAVRANIŞLAR:
1. BİLGİ İSTENDİĞİNDE: İlgili get_* tool'unu çağır, sonucu özetle.
2. İŞLEM İSTENDİĞİNDE: Önce eksik bilgiyi sor, sonra tool'u çağır.
3. İÇERİK ÜRETİMİNDE (blog, email, sayfa): 
   - Önce sorular sor (konu, hedef kitle, ton, detaylar)
   - Cevaplara göre içerik üret
   - Tool çağır (taslak olarak)
   - Admin onayını bekle
4. ASLA varsayım yapma — emin olmadığında sor.
5. Türkçe konuş, profesyonel ama samimi ol.

BAĞLAM: Admin şu anda {currentPage} sayfasında.
Mevcut kategoriler: {categories}
Mevcut ürün sayısı: {productCount}
Aktif bayi sayısı: {dealerCount}
Bekleyen sipariş: {pendingOrders}

KISITLAMALAR:
- Silme işlemlerinde her zaman onay iste.
- Toplu işlemlerde etkilenecek kayıt sayısını belirt.
- Ayar değişikliklerinde mevcut değeri ve yeni değeri yan yana göster.
- İade işleminde tutarı ve ürünleri listele.
```

---

## DOSYA YAPISI

| Aksiyon | Dosya | İçerik |
|---------|-------|--------|
| YENİ | `src/lib/ai-agent-tools.ts` | 67 tool'un functionDeclarations tanımları |
| YENİ | `src/lib/ai-agent-executor.ts` | Tool sonuçlarını /api/admin/* endpoint'lerine yönlendiren executor |
| YENİ | `src/lib/ai-agent-context.ts` | Sayfa bağlamı + DB'den dinamik context builder |
| YENİ | `src/lib/ai-agent-prompt.ts` | System prompt builder |
| YENİ | `src/app/api/admin/ai-assistant/route.ts` | POST — Gemini API çağrısı + function calling |
| YENİ | `src/components/admin/ai/AdminAIPanel.tsx` | Sağdan açılır slide-over panel (ana container) |
| YENİ | `src/components/admin/ai/AIMessageBubble.tsx` | Mesaj render (user/ai/system) |
| YENİ | `src/components/admin/ai/AIActionCard.tsx` | Önizleme + onay kartı (SEVİYE 2 ve 3) |
| YENİ | `src/components/admin/ai/AIQuickActions.tsx` | Sayfa bazlı hızlı eylem butonları |
| YENİ | `src/components/admin/ai/AIConfirmDialog.tsx` | SEVİYE 3 çift onay diyaloğu |
| MODIFY | `src/app/admin/layout.tsx` | AdminAIPanel ekleme (ADMIN rolü kontrolü ile) |
| MODIFY | `package.json` | `@google/generative-ai` ekleme |
| MODIFY | `.env` | `GEMINI_API_KEY` ekleme |

**Toplam: 10 yeni dosya, 3 modify**

---

## CLAUDE MAX İÇİN ZORUNLU KURALLAR

1. **Gemini Native Function Calling kullan** — `tools: [{ functionDeclarations: [...] }]` ile. Düz metin parse (regex/JSON block extract) YASAK.

2. **67 tool'un hepsini tanımla** — `ai-agent-tools.ts` dosyasında tüm functionDeclarations olacak. Eksik tool = eksik özellik.

3. **Mevcut API endpoint'lerini çağır** — agent yeni API yazmayacak. `ai-agent-executor.ts` içinde her tool adı → mevcut `/api/admin/*` URL'sine internal fetch ile yönlendirilecek.

4. **3 seviyeli onay sistemi zorunlu:**
   - SEVİYE 1 (get_*) → direkt çalıştır
   - SEVİYE 2 (create_*/update_*) → AIActionCard ile önizle + "Onayla"
   - SEVİYE 3 (delete_*/refund_*/batch_*) → AIConfirmDialog ile çift onay

5. **Sayfa bağlamı zorunlu** — `usePathname()` ile mevcut sayfa tespiti, hızlı eylem butonları sayfa bazlı değişecek.

6. **Konuşma geçmişi DB'ye kaydedilsin** — mevcut `chat_sessions` + `chat_messages` tablolarını kullan veya yeni `admin_ai_sessions` + `admin_ai_messages` tablosu oluştur. Sayfa yenilenince kaybolmasın.

7. **İçerik üretiminde çok adımlı akış zorunlu:**
   - Blog: konu sor → detay sor → üret → taslak kaydet → admin onayı → yayınla
   - Email şablonu: hangi şablon → değişkenler → HTML üret → önizle → onayla
   - Ürün: kategori sor → detaylar → varyasyonlar → önizle → onayla

8. **Her tool çağrısı sonrası Türkçe özet yaz:**
   - get_orders → "12 bekleyen sipariş var. En eskisi VRT-260304-2439 (₺239,90)"
   - create_blog_post → "Blog yazısı taslak olarak kaydedildi: 'Erkek Boxer Seçim Rehberi'. Yayınlamamı ister misin?"
   - process_refund → "⚠️ VRT-260304-1234 siparişi için ₺239,90 iade işlemi yapılacak. 2 ürün iade edilecek. Onaylıyor musun?"

9. **Hata durumunda kullanıcıyı bilgilendir** — API hatası olursa "İşlem başarısız: [hata mesajı]. Tekrar denememi ister misin?" şeklinde.

10. **Ctrl+K kısayolu** ile panel toggle zorunlu.

---

## KONUŞMA ÖRNEKLERİ

### Örnek 1: Bilgi İsteme
```
Admin: "Bugünkü satışlar nasıl?"
Agent: [get_dashboard çağırır — SEVİYE 1, onaysız]
Agent: "Bugün 21 sipariş var, toplam ₺239,90 ciro. Bekleyen sipariş yok. 
        Perakende: 19 sipariş (₺215,90) — Toptan: 2 sipariş (₺24,00)"
```

### Örnek 2: Blog Oluşturma (Çok Adımlı)
```
Admin: "Blog yazısı yaz"
Agent: "Hangi konuda yazmamı istersin? Birkaç soru sorayım:
        1. Konu ne? (ürün tanıtım, bakım rehberi, trend, beden seçimi?)
        2. Hangi ürün grubu? (erkek boxer, kadın külot, genel?)
        3. Kumaş odağı olsun mu? (pamuk, modal, bambu?)"

Admin: "Bambu kumaşın avantajları, kadın iç giyim için"
Agent: "Harika! Son birkaç detay:
        - Ton: Bilgilendirici mi, satış odaklı mı?
        - Yaklaşık kaç kelime? (500-800 standart blog)
        - Kapak görseli ekleyelim mi?"

Admin: "Bilgilendirici, 600 kelime, görsel şimdilik yok"
Agent: [create_blog_post çağırır — SEVİYE 2]
Agent: "Blog yazısı hazır! İşte önizleme:

        📝 Bambu Kumaş Neden Kadın İç Giyimde Tercih Ediliyor?
        
        Özet: Bambu kumaşın kadın iç giyimde sunduğu 5 benzersiz avantaj...
        Etiketler: bambu kumaş, kadın iç giyim, doğal kumaş
        SEO: ✅ Başlık 58/60 karakter, Açıklama 148/160 karakter
        
        [Tam İçeriği Önizle] [Düzenle] [Taslak Kaydet] [Yayınla]"

Admin: "Yayınla"
Agent: [update_blog_post(id, published: true) — SEVİYE 2]
Agent: "✅ Blog yazısı yayınlandı! /blog/bambu-kumas-kadin-ic-giyim adresinde."
```

### Örnek 3: Sipariş İşlemi
```
Admin: "VRT-260304-2439 siparişini kargoya ver"
Agent: [get_order("VRT-260304-2439") — SEVİYE 1]
Agent: "Sipariş buldum:
        📦 VRT-260304-2439 — Admin Kullanıcı — ₺239,90
        Durum: Ödendi
        Ürünler: 1× Vorte Erkek Boxer Siyah (M)
        
        Kargo oluşturmamı ister misin? (Geliver ile)"

Admin: "Evet"
Agent: [create_shipment(orderId) — SEVİYE 2]
Agent: "✅ Kargo oluşturuldu!
        Takip No: GL-28374651
        Firma: Geliver Kargo
        Müşteriye otomatik bildirim gönderildi."
```

### Örnek 4: Kritik İşlem (İade)
```
Admin: "VRT-260304-1738 siparişini iade et"
Agent: [get_order — SEVİYE 1]
Agent: "⚠️ İade işlemi:
        Sipariş: VRT-260304-1738 — ₺239,90
        Müşteri: Admin Kullanıcı
        Ürünler: 1× Vorte Kadın Külot Beyaz (L)
        
        Tam iade mi yoksa ürün bazlı mı?"

Admin: "Tam iade"
Agent: "🔴 DİKKAT: ₺239,90 tutarında tam iade yapılacak.
        iyzico üzerinden otomatik iade işlenir.
        Stok geri yüklenir.
        
        Bu işlem geri alınamaz. Onaylıyor musun?"

Admin: "Evet onaylıyorum"
Agent: [process_refund — SEVİYE 3, çift onay geçti]
Agent: "✅ İade tamamlandı:
        İade tutarı: ₺239,90
        iyzico iade referansı: IYZ-RF-38271
        Stok güncellendi: Kadın Külot Beyaz (L) +1"
```

### Örnek 5: Üretim Emri
```
Admin: "100 düzine erkek boxer üretimi planla"
Agent: "Üretim emri hazırlıyorum. Birkaç detay:
        1. Hangi ürün? (mevcut ürünlerden seçeyim mi?)
        2. Renk dağılımı nasıl olsun?
        3. Beden dağılımı? (standart: S%10, M%25, L%30, XL%25, XXL%10)
        4. Hedef tarih?
        5. Öncelik? (normal/yüksek/acil)"

Admin: "Siyah erkek boxer, standart beden dağılımı, 2 hafta, yüksek"
Agent: [create_production_order — SEVİYE 2]
Agent: "Üretim emri önizleme:
        🏭 ÜRT-2026-015
        Ürün: Vorte Erkek Boxer - Siyah
        Toplam: 1200 adet (100 düzine)
        Dağılım: S(120) M(300) L(360) XL(300) XXL(120)
        Hedef: 19 Mart 2026
        Öncelik: 🟠 Yüksek
        Tahmini maliyet: ~₺18.000
        
        [Onayla] [Düzenle] [İptal]"
```

### Örnek 6: Ayar Değişikliği
```
Admin: "SMTP ayarlarını güncelle, sunucu smtp.gmail.com, port 587"
Agent: [get_settings — mevcut değerleri çek]
Agent: "SMTP ayarları güncellenecek:
        
        Mevcut → Yeni
        Sunucu: (boş) → smtp.gmail.com
        Port: (boş) → 587
        
        Kullanıcı adı ve şifre de girecek misin?"

Admin: "Kullanıcı: info@vorte.com.tr, şifre: xxxx"
Agent: [update_settings — SEVİYE 2]
Agent: "✅ SMTP ayarları güncellendi. Test e-postası göndermemi ister misin?"
```

---

## TEST SENARYOLARI (Doğrulama için)

| # | Senaryo | Beklenen Davranış |
|---|---------|-------------------|
| 1 | "Bugünkü satışlar" | get_dashboard → özet |
| 2 | "Blog yaz" | Sorular sor → cevapla → create_blog_post → önizle → onayla |
| 3 | "Erkek boxer ekle" | Sorular sor → create_product → önizle → onayla |
| 4 | "Bekleyen siparişleri göster" | get_orders(status=PENDING) → liste |
| 5 | "X siparişini kargola" | get_order → create_shipment → onay |
| 6 | "X siparişini iade et" | get_order → process_refund → çift onay |
| 7 | "Yeni kampanya: %20 indirim" | Sorular sor → create_coupon → onay |
| 8 | "SMTP ayarla" | get_settings → update_settings → onay |
| 9 | "100 düzine üretim planla" | Sorular sor → create_production_order → onay |
| 10 | "SEO durumu nasıl?" | get_seo_status → özet |
| 11 | "Merchant feed'i senkronize et" | sync_merchant → onay |
| 12 | "Bayi Shell'in bakiyesi ne?" | get_dealer → cari bilgi |
| 13 | "Okunmamış mesajlar" | get_messages(unread) → liste |
| 14 | "Sipariş onay e-postasını düzenle" | get_email_templates → update_email_template → onay |
| 15 | "Admin editör ekle" | create_admin_user → çift onay |
