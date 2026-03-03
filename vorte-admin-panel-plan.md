# VORTE.COM.TR — Admin Panel Geliştirme Master Planı
## Ticimax Exclusive Seviyesi Özellik Eşleştirmesi

**Tarih:** 3 Mart 2026
**Hazırlayan:** Claude Opus 4.6 (Analiz & Plan)
**Uygulayıcı:** Claude Max (Kod Implementasyonu)
**Teknoloji:** Next.js 16 + Prisma + PostgreSQL + Coolify

---

## MEVCUT DURUM ANALİZİ

### Build Logunda Tespit Edilen Mevcut Admin Rotaları

```
/admin                    — Dashboard
/admin/ayarlar            — Ayarlar
/admin/bayiler            — Bayi listesi
/admin/bayiler/[id]       — Bayi detay
/admin/bayiler/yeni       — Yeni bayi
/admin/bildirimler        — Bildirimler
/admin/faturalar          — Faturalar
/admin/fiyatlandirma      — Fiyatlandırma
/admin/kargo              — Kargo
/admin/kuponlar           — Kuponlar
/admin/siparisler         — Sipariş listesi
/admin/siparisler/[id]    — Sipariş detay
/admin/urunler            — Ürün listesi
/admin/urunler/[id]       — Ürün düzenleme
/admin/urunler/yeni       — Yeni ürün
```

### Mevcut Bayi Rotaları

```
/bayi                     — Bayi dashboard
/bayi-girisi              — Bayi login
/bayi/faturalarim         — Bayi faturaları
/bayi/profilim            — Bayi profili
/bayi/sepet               — Bayi sepeti
/bayi/siparislerim        — Bayi siparişleri
/bayi/urunler             — Bayi ürün listesi
```

### Mevcut Kullanıcı Rotaları

```
/hesabim                  — Hesap dashboard
/hesabim/adreslerim       — Adresler
/hesabim/favorilerim      — Favoriler
/hesabim/siparislerim     — Siparişler
```

### Mevcut Entegrasyonlar (API Rotalarından)

- iyzico (ödeme) — sandbox modda
- Geliver (kargo)
- Dia CRM (e-fatura)
- Resend (e-posta)
- NextAuth (kimlik doğrulama)

---

## UYGULAMA PRENSİPLERİ

> **ÖNEMLİ: Claude Max için kurallar — kolaya kaçmayı önleme**

1. **Her faz için ayrı commit atılacak** — tek büyük commit yasak
2. **Her sayfa için gerçek CRUD işlemleri yapılacak** — mock data veya placeholder yasak
3. **Her form için validasyon olacak** — Zod schema zorunlu
4. **Her tablo için pagination olacak** — tüm veriyi tek seferde çekme yasak
5. **Her API route için yetki kontrolü olacak** — admin session kontrolü zorunlu
6. **Prisma schema değişiklikleri her fazın başında yapılacak** — migration ile
7. **Her faz sonunda `npx next build` başarılı olmalı** — 0 hata
8. **UI tutarlılığı** — mevcut admin panel tasarımına uygun olacak (shadcn/ui veya mevcut component library)
9. **Türkçe arayüz** — tüm label, buton, mesajlar Türkçe
10. **Her faz sonunda test checklist'i doğrulanacak**

---

## FAZ 1: Site Ayarları & SEO Yönetim Paneli
**Öncelik: KRİTİK | Tahmini Süre: 6-8 saat**

### 1.1 Prisma Schema Güncellemesi

`prisma/schema.prisma` dosyasına eklenecek model:

```
model SiteSettings {
  id                    String   @id @default("main")
  
  // Genel
  siteName              String   @default("Vorte Tekstil")
  siteDescription       String?
  siteUrl               String   @default("https://www.vorte.com.tr")
  contactEmail          String?
  contactPhone          String?
  contactAddress        String?
  
  // Logo & Favicon
  logoUrl               String?
  logoDarkUrl           String?
  faviconUrl            String?
  ogImageUrl            String?
  
  // SEO
  metaTitle             String?
  metaDescription       String?
  metaKeywords          String?
  
  // Üçüncü Parti Kodlar
  googleVerificationCode  String?
  googleAnalyticsId       String?
  googleAdsCode           String?
  googleMerchantId        String?
  facebookPixelId         String?
  
  // AI Chatbot
  aiSystemPrompt        String?  @db.Text
  aiEnabled             Boolean  @default(false)
  aiRules               String?  @db.Text
  
  // Sosyal Medya
  instagramUrl          String?
  facebookUrl           String?
  twitterUrl            String?
  tiktokUrl             String?
  youtubeUrl            String?
  
  // E-posta Ayarları
  smtpHost              String?
  smtpPort              Int?
  smtpUser              String?
  smtpPassword          String?
  
  // Kargo Ayarları
  freeShippingThreshold Decimal?
  defaultShippingCost   Decimal?
  
  updatedAt             DateTime @updatedAt
}
```

### 1.2 Admin Sayfası: `/admin/ayarlar` (MODIFY — Tam Yeniden Yazım)

Mevcut ayarlar sayfası yetersiz. Tab bazlı yapıya dönüştürülecek:

**Tab 1 — Genel Ayarlar:**
- Site adı, açıklama, URL
- İletişim bilgileri (telefon, email, adres)
- Logo yükleme (açık/koyu versiyon) — boyut bilgisi: "Önerilen: 256x80px, PNG/SVG"
- Favicon yükleme — boyut bilgisi: "Önerilen: 32x32px ve 180x180px, ICO/PNG"
- OG Image yükleme — boyut bilgisi: "Zorunlu: 1200x630px, PNG/JPG"

**Tab 2 — SEO Ayarları:**
- Ana sayfa meta title (60 karakter sayacı ile)
- Ana sayfa meta description (160 karakter sayacı ile)
- Meta keywords (virgülle ayrılmış, tag input)
- Google Search Console doğrulama kodu input
- Canonical domain seçimi (www vs non-www)
- robots.txt önizleme (read-only)
- sitemap.xml link (yeni sekmede aç butonu)

**Tab 3 — Üçüncü Parti Entegrasyonlar:**
- Google Analytics Ölçüm ID (G-XXXXXXXXXX)
- Google Ads dönüşüm kodu (textarea — `<head>` ve `<body>` ayrı)
- Google Merchant Center ID
- Facebook Pixel ID
- Yandex Metrika ID

**Tab 4 — AI Satış Temsilcisi:**
- AI Etkinleştir/Devre Dışı toggle
- Sistem prompt textarea (büyük, kod editör tarzı)
- AI Kuralları textarea (satır satır kurallar)
- Test butonu (prompt'u test et)

**Tab 5 — Sosyal Medya:**
- Instagram URL
- Facebook URL
- Twitter/X URL
- TikTok URL
- YouTube URL

**Tab 6 — E-posta Ayarları:**
- SMTP sunucu bilgileri
- Gönderici e-posta adresi
- Test e-postası gönder butonu

### 1.3 API Route: `/api/admin/settings` (YENİ)

- GET: Mevcut ayarları getir
- PUT: Ayarları güncelle (Zod validation)
- POST /upload: Logo/Favicon/OG Image yükleme (dosya boyutu ve boyut kontrolü ile)

### 1.4 Layout Entegrasyonu

`src/app/layout.tsx` — SiteSettings'den dinamik olarak:
- Google Analytics script inject
- Google Ads script inject
- Facebook Pixel script inject
- Meta etiketlerini DB'den çek (ISR ile cache)
- Favicon'u DB'den çek

### 1.5 Doğrulama Checklist

- [ ] `/admin/ayarlar` 6 tab çalışıyor
- [ ] Logo yüklenebiliyor, boyut uyarısı veriyor
- [ ] Favicon yüklenebiliyor
- [ ] SEO alanları kaydediliyor ve `<head>`'e yansıyor
- [ ] Google Analytics kodu kaydedilince sayfa kaynağında görünüyor
- [ ] AI system prompt kaydediliyor
- [ ] Build başarılı

---

## FAZ 2: Gelişmiş Ürün Yönetimi
**Öncelik: KRİTİK | Tahmini Süre: 8-10 saat**

### 2.1 Prisma Schema Güncellemesi

Mevcut Product modeline eklenecek alanlar:

```
// Product modeline ekle
  gtin13          String?       // Barkod/GTIN-13
  gtinPrefix      String?       // Otomatik GTIN prefix (seri üretim)
  costPrice       Decimal?      // Maliyet fiyatı
  weight          Decimal?      // Ağırlık (gram)
  
  // SEO
  seoTitle        String?
  seoDescription  String?
  seoSlug         String?       @unique
  
  // Google Merchant
  googleCategory  String?
  merchantSynced  Boolean       @default(false)
  merchantSyncedAt DateTime?

// Yeni model
model ProductVariantGtin {
  id          String   @id @default(cuid())
  variantId   String
  variant     ProductVariant @relation(fields: [variantId], references: [id])
  gtin13      String   @unique
  createdAt   DateTime @default(now())
}
```

### 2.2 Ürün Ekleme Formu İyileştirmesi: `/admin/urunler/yeni` (MODIFY)

Mevcut form kontrol edilerek eksik alanlar eklenecek. Her alan grubunu accordion/section olarak düzenle:

**Bölüm 1 — Temel Bilgiler:**
- Ürün adı
- Slug (otomatik üretilsin, düzenlenebilir)
- Açıklama (Zengin metin editörü — Tiptap veya benzeri)
- Kategori seçimi
- Durum (Aktif/Taslak/Arşiv)

**Bölüm 2 — Fiyatlandırma:**
- Perakende satış fiyatı (KDV dahil)
- Maliyet fiyatı (kar hesabı için)
- İndirimli fiyat (opsiyonel)
- KDV oranı seçimi (%1, %10, %20)

**Bölüm 3 — Varyasyonlar (Renk & Beden):**
- Renk seçenekleri (siyah, gri, lacivert / siyah, beyaz, ten rengi)
- Beden seçenekleri (S, M, L, XL, XXL)
- Her varyasyon için: stok adedi, SKU, GTIN-13
- **Otomatik GTIN üretici:** Prefix + sıralı numara ile tüm varyasyonlara peşpeşe GTIN ata
  - Örnek: Prefix "8690000" → Siyah S: 8690000000001, Siyah M: 8690000000002...

**Bölüm 4 — Görseller:**
- Çoklu görsel yükleme (drag & drop)
- Sıralama (drag ile)
- Alt text düzenleme (her görsel için)
- Boyut bilgisi: "Önerilen: 800x800px, min 500x500px, JPG/PNG/WebP, maks 2MB"
- Renk bazlı görsel eşleştirme

**Bölüm 5 — SEO:**
- SEO Title (60 karakter sayacı)
- SEO Description (160 karakter sayacı)
- OG Image seçimi (ürün görsellerinden veya özel yükleme)
- Google Product Category seçimi (dropdown)

**Bölüm 6 — Kargo:**
- Ağırlık (gram)
- Desi hesabı (en x boy x yükseklik)

### 2.3 Ürün Güncelleme: `/admin/urunler/[id]` (MODIFY)

Ekleme formu ile aynı yapıda ama:
- Mevcut veriler pre-fill
- "Değişiklikleri Kaydet" butonu
- "Ürünü Sil" butonu (onay diyaloğu ile)
- Değişiklik geçmişi (son 10 güncelleme log)
- Google Merchant senkronizasyon durumu göstergesi

### 2.4 Ürün Listeleme: `/admin/urunler` (MODIFY)

- Tablo: Ad, Görsel (thumbnail), Kategori, Fiyat, Stok, Durum, GTIN, İşlemler
- Filtreler: Kategori, durum, stok durumu (stokta/tükendi), fiyat aralığı
- Arama: Ürün adı, SKU, GTIN
- Toplu işlemler: Seçili ürünleri aktif/pasif yap, fiyat güncelle (% veya sabit tutar)
- Pagination: Sayfa başı 20 ürün
- Excel export butonu

### 2.5 Toplu GTIN Atama API: `/api/admin/products/gtin/bulk` (YENİ)

- POST: { prefix: "8690000", productIds: [...] }
- Seçili ürünlerin tüm varyasyonlarına sıralı GTIN ata

### 2.6 Doğrulama Checklist

- [ ] Yeni ürün tüm alanlarla eklenebiliyor
- [ ] Varyasyonlar (renk x beden) doğru oluşturuluyor
- [ ] GTIN otomatik atanabiliyor
- [ ] Maliyet fiyatı kaydediliyor
- [ ] Görseller yüklenip sıralanabiliyor
- [ ] SEO alanları ürün sayfasına yansıyor
- [ ] Toplu güncelleme çalışıyor
- [ ] Build başarılı

---

## FAZ 3: Slider & Banner Yönetimi
**Öncelik: YÜKSEK | Tahmini Süre: 4-5 saat**

### 3.1 Prisma Schema

```
model Slider {
  id            String   @id @default(cuid())
  title         String?
  subtitle      String?
  buttonText    String?
  buttonLink    String?
  imageDesktop  String   // Boyut bilgisi: 1920x800px
  imageMobile   String   // Boyut bilgisi: 768x600px
  altText       String?
  order         Int      @default(0)
  active        Boolean  @default(true)
  startDate     DateTime?
  endDate       DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model Banner {
  id            String   @id @default(cuid())
  name          String
  position      String   // "homepage-category", "product-sidebar", "checkout" vb.
  imageDesktop  String
  imageMobile   String?
  link          String?
  altText       String?
  active        Boolean  @default(true)
  order         Int      @default(0)
  startDate     DateTime?
  endDate       DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

### 3.2 Admin Sayfası: `/admin/slider` (YENİ)

- Slider listesi (sıralama: drag & drop)
- Slider ekle/düzenle formu:
  - Başlık, alt başlık
  - Buton metni ve linki
  - Desktop görsel yükleme — boyut: "1920x800px, maks 500KB, JPG/WebP"
  - Mobil görsel yükleme — boyut: "768x600px, maks 300KB, JPG/WebP"
  - Alt text
  - Yayın tarihi aralığı (başlangıç-bitiş)
  - Aktif/Pasif toggle
- Önizleme (desktop + mobil görünüm)

### 3.3 Admin Sayfası: `/admin/bannerlar` (YENİ)

- Banner pozisyonları yönetimi
- Banner ekle/düzenle
- Tarih bazlı zamanlama (kampanya dönemleri)

### 3.4 Frontend Entegrasyonu

- HeroSlider component'i DB'den slider verileri çekecek (mevcut statik görseller yerine)
- Cache: ISR ile 1 saat

### 3.5 Doğrulama Checklist

- [ ] Slider eklenebiliyor, sırası değiştirilebiliyor
- [ ] Görsel boyut kontrolü çalışıyor
- [ ] Zamanlama (tarih aralığı) çalışıyor
- [ ] Frontend'de DB'den slider yükleniyor
- [ ] Mobil ve desktop farklı görseller gösteriliyor
- [ ] Build başarılı

---

## FAZ 4: Sipariş Yönetimi Geliştirmesi
**Öncelik: KRİTİK | Tahmini Süre: 8-10 saat**

### 4.1 Sipariş Listesi: `/admin/siparisler` (MODIFY)

Mevcut yapıyı kontrol et ve eksikleri ekle:

- **Durum filtreleri:** Yeni, Onaylandı, Hazırlanıyor, Kargoya Verildi, Teslim Edildi, İptal, İade
- **Tarih filtresi:** Bugün, Bu Hafta, Bu Ay, Özel Aralık
- **Arama:** Sipariş no, müşteri adı, telefon, e-posta
- **Toplu işlemler:** Seçili siparişleri kargoya ver, fatura kes, durum güncelle
- **Tablo kolonları:** Sipariş No, Tarih, Müşteri, Tutar, Ödeme Durumu, Kargo Durumu, İşlemler
- **Export:** Excel, PDF

### 4.2 Sipariş Detay: `/admin/siparisler/[id]` (MODIFY)

- Sipariş özet kartı (tarih, tutar, durum)
- Müşteri bilgileri (ad, telefon, e-posta, adres)
- Ürün listesi (görsel, ad, renk, beden, adet, birim fiyat, toplam)
- Ödeme bilgileri (yöntem, durum, iyzico referans no)
- Kargo bilgileri (firma, takip no, durum, Geliver entegrasyonu)
- **Sipariş düzenleme:** Ürün ekleme/çıkarma (tutar otomatik güncellenir)
- **Durum değiştirme:** Dropdown ile — her durumda müşteriye otomatik e-posta
- **Kargo oluşturma:** Geliver API ile tek tıkla kargo kaydı + barkod yazdırma
- **Fatura kesme:** Dia CRM ile e-fatura oluştur butonu
- **İade işlemi:** Ürün bazlı iade başlat — iyzico üzerinden otomatik iade
- **Sipariş notları:** Admin'in iç notlar ekleyebildiği alan
- **Zaman çizelgesi:** Siparişin tüm durum değişiklikleri tarih-saat ile

### 4.3 Kargo Takip Sayfası: `/admin/kargo` (MODIFY)

- Kargodaki siparişler listesi
- Geliver API'den gerçek zamanlı durum çekme
- Teslim edilmeyen kargolar uyarı listesi
- Kargo barkodu yazdırma (toplu)
- Müşteriye kargo takip linki gönderme

### 4.4 Müşteri Kargo Takip: `/kargo-takip` (YENİ — Frontend)

- Sipariş numarası veya kargo takip numarası ile sorgulama
- Kargo durumu timeline görünümü
- Geliver API entegrasyonu

### 4.5 Doğrulama Checklist

- [ ] Sipariş filtreleme ve arama çalışıyor
- [ ] Sipariş durumu değiştirilebiliyor
- [ ] Kargo kaydı oluşturulabiliyor (Geliver)
- [ ] E-fatura kesilebiliyor (Dia)
- [ ] İade işlemi başlatılabiliyor (iyzico)
- [ ] Müşteri kargo takip sayfası çalışıyor
- [ ] Build başarılı

---

## FAZ 5: Fatura & Finansal Raporlama
**Öncelik: YÜKSEK | Tahmini Süre: 8-10 saat**

### 5.1 Prisma Schema

```
model Invoice {
  id              String    @id @default(cuid())
  orderId         String
  order           Order     @relation(fields: [orderId], references: [id])
  invoiceNumber   String    @unique
  invoiceSeries   String    @default("VRT")
  type            String    // "efatura", "earsiv"
  status          String    @default("draft") // draft, sent, cancelled
  diaInvoiceId    String?   // Dia CRM referans
  diaInvoiceUrl   String?   // PDF linki
  totalAmount     Decimal
  taxAmount       Decimal
  issuedAt        DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

model ProductCost {
  id              String   @id @default(cuid())
  productId       String
  product         Product  @relation(fields: [productId], references: [id])
  materialCost    Decimal  // Kumaş + malzeme
  laborCost       Decimal  // İşçilik
  overheadCost    Decimal  // Genel gider payı
  totalCost       Decimal
  calculatedAt    DateTime @default(now())
  notes           String?
}

model DailyReport {
  id              String   @id @default(cuid())
  date            DateTime @unique
  totalOrders     Int      @default(0)
  totalRevenue    Decimal  @default(0)
  totalCost       Decimal  @default(0)
  totalProfit     Decimal  @default(0)
  orderCount      Json?    // { "perakende": 5, "toptan": 2 }
  createdAt       DateTime @default(now())
}
```

### 5.2 Fatura Yönetimi: `/admin/faturalar` (MODIFY)

- Kesilen fatura listesi (numara, tarih, müşteri, tutar, durum)
- Filtre: Tarih, tür (e-fatura/e-arşiv), durum
- Toplu fatura kesme (seçili siparişler için)
- Fatura PDF görüntüleme/indirme
- Dia CRM ile senkronizasyon durumu
- İptal edilen faturalar listesi

### 5.3 Günlük/Aylık Kâr Raporu: `/admin/raporlar` (YENİ)

**Dashboard kartları:**
- Bugünkü toplam satış
- Bugünkü toplam kâr
- Bu aydaki toplam satış
- Bu aydaki toplam kâr
- Ortalama sipariş tutarı

**Detaylı raporlar:**
- Günlük kâr/zarar tablosu (tarih seçici ile)
- Aylık kâr/zarar grafiği (Recharts ile bar chart)
- Ürün bazlı kâr analizi (ürün adı, satış, maliyet, kâr, kâr marjı %)
- Kategori bazlı satış raporu
- Bayi vs perakende satış karşılaştırması
- En çok satan ürünler (top 10)
- Stok değeri raporu

### 5.4 Ürün Maliyet Hesaplama: `/admin/maliyet` (YENİ)

- Ürün seçimi
- Maliyet kalemleri giriş formu:
  - Kumaş/malzeme maliyeti (₺/adet)
  - İşçilik maliyeti (₺/adet)
  - Genel gider payı (₺/adet)
  - Ambalaj maliyeti (₺/adet)
- Otomatik toplam maliyet hesabı
- Kâr marjı hesaplayıcı: "Perakende fiyat X₺ ile kâr marjı: %Y"
- Toptan fiyat önerisi: "Maliyet + %Z kâr = W₺"
- Maliyet geçmişi (zaman içinde maliyet değişimi)

### 5.5 Doğrulama Checklist

- [ ] Fatura listesi ve filtreleme çalışıyor
- [ ] Toplu fatura kesme çalışıyor
- [ ] Günlük/aylık rapor doğru hesaplanıyor
- [ ] Grafik gösterimi çalışıyor
- [ ] Maliyet hesaplama formu çalışıyor
- [ ] Kâr marjı doğru hesaplanıyor
- [ ] Build başarılı

---

## FAZ 6: Bayi (B2B) Admin Yönetimi
**Öncelik: YÜKSEK | Tahmini Süre: 8-10 saat**

> **İŞ MODELİ:** Bayiler fiziki dükkan sahipleridir. Vorte'den toptan ürün satın alır,
> kendi mağazalarında perakende olarak satarlar. Web üzerinden son kullanıcıya satış YAPMAZLAR.
> Bayi paneli bir "toptan satın alma portalı"dır, bir e-ticaret vitrini DEĞİLDİR.

### 6.1 Prisma Schema Güncelleme

```
// Dealer modeline eklenecek alanlar
  companyName       String?     // Firma ünvanı
  taxOffice         String?     // Vergi dairesi
  taxNumber         String?     // Vergi no / TC
  shopAddress       String?     // Fiziki dükkan adresi
  shopCity          String?     // Dükkan şehri
  shopDistrict      String?     // Dükkan ilçesi
  
  discountRate      Decimal?    // Genel iskonto oranı %
  creditLimit       Decimal?    // Cari limit (₺)
  creditBalance     Decimal     @default(0)  // Cari bakiye (₺, pozitif = borç)
  minOrderAmount    Decimal?    // Min sipariş tutarı (₺)
  minOrderQuantity  Int?        // Min sipariş adedi (düzine bazlı: 12, 24, 36...)
  paymentTermDays   Int         @default(0)  // Vade günü (0 = peşin)
  
  dealerTier        String      @default("standard") // standard, silver, gold, platinum
  approved          Boolean     @default(false) // Bayi başvuru onayı
  approvedAt        DateTime?
  approvedBy        String?     // Admin user id
  notes             String?     @db.Text  // Admin iç notları
  
model DealerPricing {
  id              String   @id @default(cuid())
  dealerId        String
  dealer          Dealer   @relation(fields: [dealerId], references: [id])
  productId       String
  product         Product  @relation(fields: [productId], references: [id])
  wholesalePrice  Decimal  // Bu bayiye özel toptan fiyat
  minQuantity     Int      @default(12) // Min sipariş adedi (düzine bazlı)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@unique([dealerId, productId])
}

model DealerTierDiscount {
  id              String   @id @default(cuid())
  tier            String   @unique // standard, silver, gold, platinum
  discountRate    Decimal  // Genel iskonto oranı %
  minOrderAmount  Decimal  // Min sipariş tutarı
  paymentTermDays Int      @default(0)
  description     String?
}

model DealerPayment {
  id              String   @id @default(cuid())
  dealerId        String
  dealer          Dealer   @relation(fields: [dealerId], references: [id])
  orderId         String?
  order           Order?   @relation(fields: [orderId], references: [id])
  amount          Decimal
  type            String   // "payment" (ödeme), "debt" (borç/sipariş), "refund" (iade)
  method          String?  // "havale", "nakit", "cek", "kredi_karti"
  description     String?
  createdAt       DateTime @default(now())
}
```

### 6.2 Bayi Başvuru Sistemi: `/toptan` sayfası (MODIFY)

Mevcut toptan sayfasına bayi başvuru formu ekle:
- Firma ünvanı, vergi dairesi, vergi no
- Yetkili adı, telefon, e-posta
- Fiziki dükkan adresi (il, ilçe, açık adres)
- Dükkan fotoğrafı yükleme (isteğe bağlı)
- Tahmini aylık sipariş adedi
- Başvuru durumu takip: "Başvurunuz değerlendiriliyor" sayfası

### 6.3 Bayi Yönetimi: `/admin/bayiler` (MODIFY — Tam Yeniden Yazım)

**Bayi Listesi:**
- Tablo: Firma Adı, Yetkili, Şehir, Seviye (badge), İskonto %, Cari Bakiye, Durum, İşlemler
- Filtreler: Durum (bekleyen/onaylı/pasif), seviye, şehir
- Arama: Firma adı, yetkili adı, telefon
- Badge renkleri: Standard (gri), Silver (gümüş), Gold (altın), Platinum (mor)
- Cari bakiye kırmızı = borçlu, yeşil = güncel

**Bayi Detay: `/admin/bayiler/[id]` (MODIFY — Tam Yeniden Yazım)**

**Tab 1 — Genel Bilgiler:**
- Firma ünvanı, vergi dairesi, vergi no
- Yetkili adı, telefon, e-posta
- Fiziki dükkan adresi
- Başvuru tarihi, onay tarihi, onaylayan admin
- Bayi seviyesi değiştirme (Standard → Silver → Gold → Platinum)
- Aktif/Pasif toggle
- Admin notları textarea

**Tab 2 — Fiyatlandırma & İskonto:**
- Genel iskonto oranı (%) — seviye bazlı otomatik veya manuel override
- Ürün bazlı özel toptan fiyat tablosu (DealerPricing):
  - Tablo: Ürün Adı, Perakende Fiyat, Genel Toptan Fiyat, Bu Bayiye Özel Fiyat, İşlem
  - Inline düzenleme (tıkla → düzenle → kaydet)
- Minimum sipariş tutarı (₺)
- Minimum sipariş adedi (düzine bazlı)
- Seviye bazlı varsayılan iskonto yönetimi (DealerTierDiscount)

**Tab 3 — Cari Hesap:**
- Cari bakiye kartı (büyük, belirgin): "Bu bayinin bakiyesi: X₺"
- Cari limit kartı: "Limit: Y₺ | Kullanılabilir: Z₺"
- Vade günü bilgisi
- Cari hareket tablosu (DealerPayment):
  - Tarih, Açıklama, Borç(₺), Alacak(₺), Bakiye(₺)
  - Sipariş verildi → borç satırı (otomatik)
  - Ödeme yapıldı → alacak satırı (admin girer)
  - İade → alacak satırı (otomatik)
- **Manuel ödeme kaydet butonu:** Tutar, yöntem (havale/nakit/çek), açıklama
- Cari ekstresi yazdırma (PDF)
- Tarih filtresi

**Tab 4 — Sipariş Geçmişi:**
- Bu bayinin tüm siparişleri (tarih, sipariş no, ürünler, tutar, durum)
- Toplam sipariş sayısı ve toplam harcama
- Son 12 ay sipariş grafiği (aylık)

**Tab 5 — Fatura Geçmişi:**
- Kesilen faturalar listesi (e-fatura/e-arşiv)
- Fatura PDF görüntüleme/indirme

### 6.4 Bayi Seviye Yönetimi: `/admin/ayarlar` → Bayi Seviyeleri Tab'ı (YENİ)

- Seviye tanımlama: Standard, Silver, Gold, Platinum
- Her seviye için:
  - Varsayılan iskonto oranı (%)
  - Varsayılan minimum sipariş tutarı
  - Varsayılan vade günü
  - Açıklama

### 6.5 Doğrulama Checklist

- [ ] Bayi başvuru formu çalışıyor
- [ ] Başvuru admin panelde "bekleyen" olarak görünüyor
- [ ] Bayi onaylandığında giriş bilgileri e-posta ile gidiyor
- [ ] Seviye bazlı iskonto otomatik uygulanıyor
- [ ] Bayiye özel fiyat tanımlanabiliyor
- [ ] Cari hesap doğru hesaplanıyor (borç/alacak)
- [ ] Manuel ödeme kaydı yapılabiliyor
- [ ] Cari ekstresi PDF olarak indirilebiliyor
- [ ] Cari limit aşıldığında sipariş engellenebiliyor
- [ ] Build başarılı

---

## FAZ 7: Google Merchant Center Entegrasyonu
**Öncelik: YÜKSEK | Tahmini Süre: 5-6 saat**

### 7.1 Google Merchant Feed API: `/api/merchant/feed` (YENİ)

XML feed oluştur (Google Shopping standartlarında):

```xml
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>Vorte Tekstil</title>
    <item>
      <g:id>SKU</g:id>
      <g:title>Vorte Erkek Boxer Siyah</g:title>
      <g:description>...</g:description>
      <g:link>https://www.vorte.com.tr/urun/slug</g:link>
      <g:image_link>...</g:image_link>
      <g:price>199.00 TRY</g:price>
      <g:availability>in_stock</g:availability>
      <g:brand>Vorte</g:brand>
      <g:gtin>8690000000001</g:gtin>
      <g:condition>new</g:condition>
      <g:google_product_category>...</g:google_product_category>
      <g:item_group_id>PARENT-ID</g:item_group_id>
      <g:color>Siyah</g:color>
      <g:size>M</g:size>
    </item>
  </channel>
</rss>
```

### 7.2 Admin Sayfası: `/admin/merchant` (YENİ)

- Merchant Center bağlantı durumu
- Feed URL'si (kopyalanabilir)
- Son senkronizasyon tarihi
- Ürün bazlı senkronizasyon durumu (synced/pending/error)
- Manuel senkronizasyon tetikleme butonu
- Google Product Category eşleştirme arayüzü
- Feed önizleme (XML)
- GTIN eksik ürünler uyarı listesi

### 7.3 Otomatik Feed Güncelleme

- Ürün ekleme/güncelleme/silme durumunda feed otomatik invalidate
- ISR ile feed cache (1 saat)

### 7.4 Doğrulama Checklist

- [ ] `/api/merchant/feed` XML feed doğru oluşuyor
- [ ] Tüm ürünler feed'de görünüyor
- [ ] GTIN'ler feed'e yansıyor
- [ ] Renk ve beden varyasyonları doğru
- [ ] Google Merchant XML validator'dan geçiyor
- [ ] Build başarılı

---

## FAZ 8: E-posta Yönetimi & Inbox
**Öncelik: ORTA | Tahmini Süre: 6-8 saat**

### 8.1 Prisma Schema

```
model EmailTemplate {
  id          String   @id @default(cuid())
  name        String   @unique  // "order-confirmation", "shipping-notification" vb.
  subject     String
  body        String   @db.Text  // HTML template
  variables   String?  // JSON: ["customerName", "orderNumber", ...]
  active      Boolean  @default(true)
  updatedAt   DateTime @updatedAt
}

model EmailLog {
  id          String   @id @default(cuid())
  to          String
  subject     String
  templateId  String?
  status      String   // "sent", "failed", "bounced"
  sentAt      DateTime @default(now())
  error       String?
}

model ContactMessage {
  id          String   @id @default(cuid())
  name        String
  email       String
  phone       String?
  subject     String
  message     String   @db.Text
  read        Boolean  @default(false)
  replied     Boolean  @default(false)
  replyText   String?  @db.Text
  repliedAt   DateTime?
  createdAt   DateTime @default(now())
}
```

### 8.2 E-posta Şablonları: `/admin/email-sablonlari` (YENİ)

Varsayılan şablonlar (ilk migration'da seed):
- Sipariş onayı
- Kargoya verildi bildirimi
- Teslim edildi bildirimi
- İade onayı
- Hoş geldiniz (yeni üye)
- Şifre sıfırlama
- Bayi başvuru onayı
- Newsletter

Her şablon için:
- Konu satırı düzenleme
- HTML body düzenleme (basit WYSIWYG)
- Değişken listesi ({{customerName}}, {{orderNumber}} vb.)
- Önizleme butonu
- Test e-postası gönder butonu

### 8.3 Gelen Kutusu (Inbox): `/admin/mesajlar` (YENİ)

- İletişim formundan gelen mesajlar listesi
- Okundu/okunmadı durumu
- Yanıtla butonu (yanıt e-posta olarak gönderilir)
- Filtreleme: okunmamış, yanıtlanmamış, tarih
- Mesaj detay görünümü

### 8.4 E-posta Gönderim Logu: `/admin/email-log` (YENİ)

- Gönderilen tüm e-postalar listesi
- Durum: Gönderildi, Başarısız, Bounced
- Tarih filtresi
- Yeniden gönder butonu (başarısızlar için)

### 8.5 Doğrulama Checklist

- [ ] E-posta şablonları düzenlenebiliyor
- [ ] Sipariş durumu değiştiğinde otomatik e-posta gidiyor
- [ ] İletişim formu mesajları inbox'ta görünüyor
- [ ] Mesaj yanıtlama çalışıyor
- [ ] E-posta log'u doğru kaydediliyor
- [ ] Build başarılı

---

## FAZ 9: Üretim Planlama & Takip
**Öncelik: ORTA | Tahmini Süre: 6-8 saat**

### 9.1 Prisma Schema

```
model ProductionOrder {
  id              String   @id @default(cuid())
  orderNumber     String   @unique  // ÜRT-2026-001
  productId       String
  product         Product  @relation(fields: [productId], references: [id])
  variants        Json     // [{ color: "Siyah", size: "M", quantity: 100 }, ...]
  totalQuantity   Int
  status          String   @default("planned") // planned, cutting, sewing, quality, packaging, completed
  priority        String   @default("normal") // low, normal, high, urgent
  startDate       DateTime?
  targetDate      DateTime
  completedDate   DateTime?
  materialCost    Decimal?
  laborCost       Decimal?
  notes           String?  @db.Text
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model ProductionLog {
  id                String          @id @default(cuid())
  productionOrderId String
  productionOrder   ProductionOrder @relation(fields: [productionOrderId], references: [id])
  fromStatus        String
  toStatus          String
  note              String?
  createdAt         DateTime        @default(now())
}
```

### 9.2 Üretim Planlama: `/admin/uretim` (YENİ)

**Kanban Board görünümü:**
- Kolonlar: Planlanan → Kesim → Dikim → Kalite Kontrol → Paketleme → Tamamlandı
- Kart: Üretim emri no, ürün adı, toplam adet, hedef tarih, öncelik rengi
- Drag & drop ile durum değiştirme
- Her durum değişikliğinde log kaydı

**Liste görünümü:**
- Tablo: Üretim No, Ürün, Toplam Adet, Durum, Başlangıç, Hedef, İşlemler
- Filtreler: Durum, ürün, tarih aralığı, öncelik

**Yeni üretim emri formu:**
- Ürün seçimi
- Varyasyon bazlı adet girişi (renk x beden matrisi)
- Hedef tamamlanma tarihi
- Öncelik seçimi
- Malzeme maliyet tahmini (otomatik hesaplama)
- Notlar

### 9.3 Üretim Detay: `/admin/uretim/[id]` (YENİ)

- Üretim emri özeti
- Varyasyon detayları (renk-beden matrisi ile adetler)
- Durum zaman çizelgesi (timeline)
- Maliyet özeti
- Not ekleme
- Durum güncelleme

### 9.4 Doğrulama Checklist

- [ ] Üretim emri oluşturulabiliyor
- [ ] Kanban board drag & drop çalışıyor
- [ ] Durum değişiklikleri loglanıyor
- [ ] Varyasyon matrisi doğru çalışıyor
- [ ] Maliyet hesabı yapılıyor
- [ ] Build başarılı

---

## FAZ 10: İçerik Yönetimi (CMS)
**Öncelik: ORTA | Tahmini Süre: 5-6 saat**

### 10.1 Prisma Schema

```
model Page {
  id          String   @id @default(cuid())
  title       String
  slug        String   @unique
  content     String   @db.Text  // HTML içerik
  seoTitle    String?
  seoDescription String?
  template    String   @default("default") // default, fullwidth, sidebar
  published   Boolean  @default(false)
  order       Int      @default(0)
  showInMenu  Boolean  @default(false)
  showInFooter Boolean @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model BlogPost {
  id          String   @id @default(cuid())
  title       String
  slug        String   @unique
  excerpt     String?
  content     String   @db.Text
  coverImage  String?
  seoTitle    String?
  seoDescription String?
  published   Boolean  @default(false)
  publishedAt DateTime?
  authorName  String   @default("Vorte Tekstil")
  tags        String?  // Virgülle ayrılmış
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### 10.2 Sayfa Yönetimi: `/admin/sayfalar` (YENİ)

- Sayfa listesi (başlık, slug, durum, menüde/footer'da göster)
- Sayfa ekle/düzenle:
  - Başlık
  - Slug (otomatik, düzenlenebilir)
  - İçerik editörü (Tiptap — zengin metin, görsel ekleme, tablo)
  - SEO alanları
  - Şablon seçimi
  - Menüde göster toggle
  - Footer'da göster toggle
  - Yayınla/Taslak toggle

### 10.3 Blog Yönetimi: `/admin/blog` (YENİ)

- Blog yazısı listesi
- Blog yazısı ekle/düzenle:
  - Başlık, slug
  - Kapak görseli (boyut: "1200x630px")
  - Kısa özet
  - İçerik editörü
  - Etiketler (tag input)
  - SEO alanları
  - Yayınla/Taslak toggle
  - Yayın tarihi seçici

### 10.4 Frontend Entegrasyonu

- Dinamik sayfa routing: `/[pageSlug]` — DB'den sayfa çek
- Blog listeleme: `/blog` — pagination ile
- Blog detay: `/blog/[slug]`
- Sitemap'e blog yazılarını ekle

### 10.5 Doğrulama Checklist

- [ ] Yeni sayfa oluşturulabiliyor ve frontend'de görünüyor
- [ ] Blog yazısı oluşturulabiliyor
- [ ] WYSIWYG editör düzgün çalışıyor
- [ ] SEO alanları head'e yansıyor
- [ ] Sitemap'te yeni sayfalar görünüyor
- [ ] Build başarılı

---

## FAZ 11: Kullanıcı Yönetimi & Yetkilendirme
**Öncelik: ORTA | Tahmini Süre: 5-6 saat**

### 11.1 Prisma Schema

```
model AdminUser {
  id          String   @id @default(cuid())
  email       String   @unique
  password    String
  name        String
  role        String   @default("editor") // superadmin, admin, editor, viewer
  permissions Json?    // Granüler yetkiler: { "products": "rw", "orders": "r", ... }
  active      Boolean  @default(true)
  lastLogin   DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### 11.2 Admin Kullanıcı Yönetimi: `/admin/kullanicilar` (YENİ)

- Kullanıcı listesi (ad, email, rol, son giriş, durum)
- Kullanıcı ekle/düzenle:
  - Ad, email, şifre
  - Rol seçimi: Süper Admin, Admin, Editör, Görüntüleyici
  - Granüler yetkilendirme checkboxları:
    - Ürünler: Görme / Ekleme / Düzenleme / Silme
    - Siparişler: Görme / Düzenleme / İptal
    - Bayiler: Görme / Düzenleme
    - Faturalar: Görme / Kesme
    - Ayarlar: Görme / Düzenleme
    - Raporlar: Görme
    - Kullanıcılar: Yönetme (sadece superadmin)

### 11.3 Müşteri Yönetimi: `/admin/musteriler` (YENİ)

- Kayıtlı müşteri listesi (ad, email, telefon, toplam sipariş, toplam harcama)
- Müşteri detay: sipariş geçmişi, adresler, favoriler
- Müşteri engelleme/aktifleştirme
- Toplu e-posta gönderimi (seçili müşterilere)

### 11.4 Doğrulama Checklist

- [ ] Farklı roller oluşturulabiliyor
- [ ] Yetkisiz erişim engelliyor (403)
- [ ] Editör rolü sadece ürün düzenleyebiliyor
- [ ] Müşteri listesi ve detayları görüntülenebiliyor
- [ ] Build başarılı

---

## FAZ 12: Kampanya & Kupon Sistemi Geliştirmesi
**Öncelik: ORTA | Tahmini Süre: 5-6 saat**

### 12.1 Mevcut Kupon Sistemini Genişlet

Mevcut `/admin/kuponlar` sayfasını geliştir:

**Kampanya Türleri:**
- Yüzde indirim (sepet geneli)
- Sabit tutar indirim
- X Al Y Öde (3 al 2 öde)
- Ücretsiz kargo
- Hediye ürün (sepete otomatik ekle)
- Ürün bazlı indirim (belirli ürünlere)
- Kategori bazlı indirim
- Minimum sepet tutarı şartlı indirim
- İlk sipariş indirimi
- Doğum günü kuponu

**Kampanya koşulları:**
- Başlangıç ve bitiş tarihi
- Kullanım limiti (toplam ve kişi başı)
- Minimum sipariş tutarı
- Sadece perakende / sadece toptan / her ikisi
- Belirli ürünler/kategoriler için

### 12.2 Doğrulama Checklist

- [ ] Her kampanya türü sepette doğru uygulanıyor
- [ ] Tarih ve kullanım limitleri çalışıyor
- [ ] Kupon kodu doğrulama çalışıyor
- [ ] Build başarılı

---

## FAZ 13: AI Chatbot Entegrasyonu
**Öncelik: ORTA | Tahmini Süre: 6-8 saat**

### 13.1 Chat Widget: `src/components/chat/ChatWidget.tsx` (YENİ)

- Sağ alt köşe sabit buton (floating action button)
- Tıklandığında chat penceresi açılır
- Mesaj geçmişi (session bazlı)
- Müşteri mesaj input'u
- AI yanıt bekleniyor animasyonu

### 13.2 Chat API: `/api/chat` (YENİ)

- Anthropic Claude API entegrasyonu
- System prompt: SiteSettings'den çekilecek (admin panelden düzenlenebilir)
- Context: Mevcut ürünler, fiyatlar, stok durumu DB'den inject
- Conversation history: Session bazlı (son 20 mesaj)

### 13.3 Admin Chat Monitörü: `/admin/chat` (YENİ)

- Aktif chat oturumları listesi
- Chat geçmişi görüntüleme
- Müdahale butonu (AI'ı devre dışı bırak, admin olarak yanıtla)

### 13.4 Doğrulama Checklist

- [ ] Chat widget tüm sayfalarda görünüyor
- [ ] AI ürün bilgisi sorulan soruları yanıtlayabiliyor
- [ ] System prompt admin panelden değiştirilebiliyor
- [ ] Chat geçmişi admin panelden görüntülenebiliyor
- [ ] Build başarılı

---

## FAZ 14: Gelişmiş SEO Araçları
**Öncelik: ORTA | Tahmini Süre: 4-5 saat**

### 14.1 SEO Dashboard: `/admin/seo` (YENİ)

- Tüm sayfaların SEO durumu özet kartı (meta title olan/olmayan, description olan/olmayan)
- Toplu SEO güncelleme (seçili ürünlerin title/description'ını bir kalıpla güncelle)
  - Kalıp: "{Ürün Adı} - {Renk} | Vorte Tekstil | Toptan ve Perakende"
- 301 Yönlendirme yönetimi:
  - Eski URL → Yeni URL eşleştirme
  - Middleware'a otomatik ekle
- 404 Sayfa Logları:
  - Ziyaretçilerin karşılaştığı 404 sayfaları listesi
  - Sık karşılaşılanlara 301 redirect önerisi
- Sitemap önizleme (tüm URL'ler ve durumları)
- robots.txt düzenleme arayüzü
- Google Rich Results Test linki (her ürün için)

### 14.2 Doğrulama Checklist

- [ ] SEO dashboard tüm sayfaların durumunu gösteriyor
- [ ] Toplu SEO güncelleme çalışıyor
- [ ] 301 redirect tanımlanabiliyor ve çalışıyor
- [ ] 404 logları kaydediliyor
- [ ] Build başarılı

---

## FAZ 15: Dashboard İyileştirmesi
**Öncelik: ORTA | Tahmini Süre: 4-5 saat**

### 15.1 Admin Dashboard: `/admin` (MODIFY)

Mevcut dashboard'u kapsamlı analitik panele dönüştür:

**Üst Sıra — Özet Kartları:**
- Bugünkü satış (₺ ve adet)
- Bu haftanın satışı
- Bu ayın satışı
- Bekleyen siparişler
- Stokta azalan ürünler (uyarı)
- Aktif bayi sayısı

**Grafik Alanı:**
- Son 30 gün satış grafiği (line chart)
- Kategori bazlı satış dağılımı (pie chart)
- Perakende vs Toptan karşılaştırması (bar chart)

**Hızlı Erişim:**
- Son 10 sipariş
- Stoku biten/azalan ürünler uyarı listesi
- Okunmamış mesajlar
- Bekleyen bayi başvuruları
- Bugünkü üretim durumu özeti

### 15.2 Doğrulama Checklist

- [ ] Tüm kartlar gerçek veriden hesaplanıyor
- [ ] Grafikler doğru çiziliyor
- [ ] Hızlı erişim linkleri çalışıyor
- [ ] Stok uyarıları görünüyor
- [ ] Build başarılı

---

## FAZ 16: Bayi Paneli (Frontend — Toptan Satın Alma Portalı)
**Öncelik: YÜKSEK | Tahmini Süre: 10-14 saat**

> **KRİTİK KURAL:** Bayi paneli bir "toptan satın alma portalı"dır.
> Bayiler bu panelden Vorte'den toptan ürün satın alır, kendi fiziki mağazalarında satar.
> Bayi panelinde SON KULLANICIYA SATIŞ ÖZELLİĞİ YOKTUR.
> Vitrin yok, müşteri yok, online mağaza yok. Sadece SATIN ALMA.

### 16.1 Bayi Giriş: `/bayi-girisi` (MODIFY — Tam Yeniden Yazım)

- E-posta + şifre ile giriş
- "Şifremi Unuttum" linki → e-posta ile sıfırlama
- "Bayi Başvurusu" linki → `/toptan` sayfasına yönlendirme
- Giriş sonrası → `/bayi` dashboard'a yönlendir
- Onaylanmamış bayi girişi → "Başvurunuz henüz onaylanmadı" mesajı
- Pasif bayi girişi → "Hesabınız askıya alınmıştır, iletişime geçin" mesajı

### 16.2 Bayi Dashboard: `/bayi` (MODIFY — Tam Yeniden Yazım)

**Üst Sıra — Özet Kartları:**
- Cari Bakiye kartı (büyük, belirgin):
  - Yeşil: "Bakiyeniz güncel" (bakiye ≤ 0)
  - Turuncu: "Bakiyeniz: X₺" (bakiye > 0, limit altında)
  - Kırmızı: "Cari limitiniz aşıldı!" (bakiye > cari limit)
- Vade bilgisi: "Sonraki ödeme tarihi: DD.MM.YYYY"
- Bu ayki sipariş adedi
- Bu ayki sipariş tutarı
- İskonto oranı badge: "Gold Bayi — %25 İskonto"

**Hızlı Erişim:**
- "Yeni Sipariş Ver" butonu (büyük, belirgin CTA) → `/bayi/urunler`
- Son 5 sipariş listesi (tarih, tutar, durum)
- Duyurular alanı (admin'in bayilere gönderdiği mesajlar)

### 16.3 Bayi Ürün Kataloğu: `/bayi/urunler` (MODIFY — Tam Yeniden Yazım)

> Bu sayfa bayinin ürün seçip sepete eklediği ana sayfadır.
> Mağaza vitrini DEĞİL, toptan sipariş kataloğudur.

**Görünüm:**
- Grid veya liste görünümü toggle
- Her ürün kartı:
  - Ürün görseli (tek görsel yeterli)
  - Ürün adı
  - ~~Perakende fiyat~~ (üstü çizili, referans)
  - **Bayi fiyatı** (iskontolu fiyat, büyük font, yeşil)
  - İskonto badge: "-%25"
  - Stok durumu: "Stokta" / "Stok Tükeniyor (X adet)" / "Stok Yok"
  - "Sepete Ekle" butonu

**Filtreler:**
- Kategori: Erkek Boxer, Kadın Külot
- Renk: Siyah, Gri, Lacivert / Siyah, Beyaz, Ten Rengi
- Stok durumu: Stokta Olanlar / Tümü

**Sepete ekleme akışı (ürün kartına tıklayınca veya hızlı ekleme):**
- Renk seçimi (checkbox veya buton grubu)
- Beden seçimi: Her beden için ayrı adet input
- **Düzine bazlı sipariş zorlaması:**
  - Minimum sipariş: 12 adet (veya admin'in belirlediği min)
  - Adet input'u 12'nin katları önersin (12, 24, 36, 48...)
  - 12'nin katı değilse uyarı: "Toptan siparişler düzine bazlıdır. En yakın: X adet"
- **Hızlı beden dağılımı matrisi:**

  ```
  Renk: Siyah
  ┌──────┬────┬────┬────┬────┬─────┬────────┐
  │ Beden│  S │  M │  L │ XL │ XXL │ TOPLAM │
  ├──────┼────┼────┼────┼────┼─────┼────────┤
  │ Adet │  2 │  4 │  4 │  3 │  1  │   14   │
  └──────┴────┴────┴────┴────┴─────┴────────┘
  Stok:    45   38   52   41   22
  ```

- Toplam adet ve toplam tutar anlık gösterilecek
- "Sepete Ekle" butonu

### 16.4 Bayi Ürün Detay: `/bayi/urunler/[id]` (YENİ)

- Ürün görselleri (galeri)
- Ürün adı ve açıklama
- Fiyat bilgisi: Perakende (referans) → Bayi fiyatı (iskontolu)
- Renk seçenekleri
- Beden-adet matrisi (yukarıdaki gibi)
- Stok durumu (renk x beden bazında)
- "Sepete Ekle" butonu

### 16.5 Bayi Sepeti: `/bayi/sepet` (MODIFY — Tam Yeniden Yazım)

**Sepet Tablosu:**
- Ürün görseli (thumbnail)
- Ürün adı
- Renk
- Beden dağılımı: S(2) M(4) L(4) XL(3) XXL(1)
- Toplam adet
- Birim fiyat (bayi fiyatı)
- Satır toplamı
- Adet düzenleme (inline)
- Satır silme

**Sepet Özet Paneli (sağ taraf veya alt):**
- Ara toplam: X₺
- İskonto (%Y): -Z₺
- KDV (%W): +V₺
- **Genel Toplam: T₺**
- Cari bakiye bilgisi: "Mevcut bakiyeniz: X₺ | Limit: Y₺"
- Cari limit kontrolü:
  - Limit yeterliyse → yeşil onay ikonu
  - Limit aşılacaksa → kırmızı uyarı: "Bu sipariş cari limitinizi Z₺ aşacaktır"
- Minimum sipariş kontrolü:
  - Minimum tutar kontrolü
  - Minimum adet kontrolü (düzine bazlı)

**Ödeme Yöntemi Seçimi:**
- Açık hesap (cariye ekle) — varsayılan, vade günü bilgisi gösterilir
- Havale/EFT ile ödeme — banka bilgileri gösterilir
- Kredi kartı ile ödeme (iyzico) — sadece admin aktif ettiyse

**Teslimat Seçenekleri:**
- Kargo ile gönderim (Geliver) — adres seçimi
- Fabrikadan teslim (Nilüfer/Bursa) — randevu tarihi seçimi

**Sipariş Notu:**
- Textarea: Bayi özel isteklerini yazabilir

**"Sipariş Ver" butonu:**
- Cari limit kontrolü → aşıyorsa engelle
- Minimum sipariş kontrolü → altındaysa engelle
- Onay diyaloğu: "X adet ürün, toplam Y₺. Ödeme: Açık Hesap (vade: 30 gün). Onaylıyor musunuz?"
- Sipariş oluştur → bayi cari bakiyesine borç ekle (otomatik)
- Sipariş onay sayfasına yönlendir

### 16.6 Bayi Siparişlerim: `/bayi/siparislerim` (MODIFY — Tam Yeniden Yazım)

**Sipariş Listesi:**
- Tablo: Sipariş No, Tarih, Ürün Sayısı, Toplam Adet, Tutar, Durum, İşlemler
- Durum badge'leri: Bekliyor (sarı), Onaylandı (mavi), Hazırlanıyor (turuncu), Kargoda (mor), Teslim Edildi (yeşil), İptal (kırmızı)
- Filtre: Durum, tarih aralığı
- "Yeniden Sipariş Ver" butonu (önceki siparişin aynısını sepete ekle)

**Sipariş Detay: `/bayi/siparislerim/[id]` (YENİ)**
- Sipariş özet kartı
- Ürün listesi: Görsel, Ad, Renk, Beden Dağılımı, Adet, Birim Fiyat, Toplam
- Kargo bilgileri ve takip numarası
- Fatura görüntüleme/indirme (PDF)
- Sipariş durumu timeline

### 16.7 Bayi Cari Hesabım: `/bayi/cari-hesap` (YENİ)

**Bakiye Kartı:**
- Cari bakiye (büyük, belirgin)
- Cari limit
- Kullanılabilir limit
- Vade bilgisi

**Cari Hareket Tablosu:**
- Tarih, Açıklama (sipariş no veya ödeme açıklaması), Borç(₺), Alacak(₺), Bakiye(₺)
- Tarih filtresi
- "Cari Ekstresi İndir (PDF)" butonu

**Ödeme Bilgileri:**
- Vorte banka hesap bilgileri (havale için)
- Online ödeme butonu (cari borcunu kredi kartıyla öde — iyzico)

### 16.8 Bayi Faturalarım: `/bayi/faturalarim` (MODIFY)

- Fatura listesi: Fatura No, Tarih, Sipariş No, Tutar, Durum
- Fatura PDF görüntüleme/indirme
- Tarih filtresi

### 16.9 Bayi Profilim: `/bayi/profilim` (MODIFY)

- Firma bilgileri (read-only — değişiklik için admin'e başvuru)
- Yetkili bilgileri düzenleme (ad, telefon)
- Teslimat adresi düzenleme
- Şifre değiştirme
- Bayi seviyesi bilgisi (read-only): "Gold Bayi — %25 İskonto"

### 16.10 Bayi Duyurular: `/bayi/duyurular` (YENİ)

- Admin'in bayilere gönderdiği duyurular listesi
- Okundu/okunmadı durumu
- Tarih sıralaması

### 16.11 Doğrulama Checklist

- [ ] Bayi girişi ve yetkilendirme çalışıyor
- [ ] Onaylanmamış/pasif bayi giremiyor
- [ ] Dashboard cari bakiye doğru gösteriliyor
- [ ] Ürün kataloğunda bayi fiyatları görünüyor (iskontolu)
- [ ] Beden-adet matrisi doğru çalışıyor
- [ ] Düzine bazlı minimum sipariş kontrolü çalışıyor
- [ ] Sepette cari limit kontrolü yapılıyor
- [ ] Sipariş verildiğinde cari bakiyeye borç ekleniyor
- [ ] "Yeniden Sipariş Ver" çalışıyor
- [ ] Cari hesap hareket tablosu doğru
- [ ] Cari ekstresi PDF olarak indirilebiliyor
- [ ] Fatura PDF görüntülenebiliyor
- [ ] Build başarılı

---

## FAZ 17: Müşteri (Perakende) Paneli
**Öncelik: YÜKSEK | Tahmini Süre: 8-10 saat**

> **İŞ MODELİ:** Perakende müşteriler web sitesinden doğrudan alışveriş yapar.
> Standart e-ticaret deneyimi: ürün seç → sepete ekle → ödeme yap → kargo ile teslim.

### 17.1 Prisma Schema Güncelleme

```
// User modeline eklenecek alanlar (mevcut eksiklere göre)
  phone             String?
  birthDate         DateTime?
  gender            String?     // "erkek", "kadın", "belirtmek-istemiyorum"
  newsletterConsent Boolean     @default(false)
  kvkkConsent       Boolean     @default(false)
  kvkkConsentDate   DateTime?
  lastLoginAt       DateTime?
  orderCount        Int         @default(0)
  totalSpent        Decimal     @default(0)

model Address {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  title           String   // "Ev", "İş" vb.
  fullName        String
  phone           String
  city            String
  district        String
  neighborhood    String?
  addressLine     String   @db.Text
  postalCode      String?
  isDefault       Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model Favorite {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  productId       String
  product         Product  @relation(fields: [productId], references: [id])
  createdAt       DateTime @default(now())
  
  @@unique([userId, productId])
}

model ProductReview {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  productId       String
  product         Product  @relation(fields: [productId], references: [id])
  orderId         String?
  rating          Int      // 1-5
  title           String?
  comment         String?  @db.Text
  approved        Boolean  @default(false) // Admin onayı gerekli
  createdAt       DateTime @default(now())
  
  @@unique([userId, productId, orderId])
}

model ReturnRequest {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  orderId         String
  order           Order    @relation(fields: [orderId], references: [id])
  orderItemId     String?  // Ürün bazlı iade
  reason          String   // "beden_uyumsuz", "kusurlu", "yanlis_urun", "diger"
  description     String?  @db.Text
  status          String   @default("pending") // pending, approved, rejected, shipped, completed, refunded
  refundAmount    Decimal?
  cargoTrackingNo String?  // İade kargo takip
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### 17.2 Kayıt & Giriş Akışı (MODIFY)

**Kayıt:**
- Ad, soyad
- E-posta
- Telefon
- Şifre (min 8 karakter, güç göstergesi)
- KVKK onay checkbox (zorunlu): "KVKK Aydınlatma Metni'ni okudum ve kabul ediyorum"
- Newsletter checkbox (isteğe bağlı): "Kampanya ve yeniliklerden haberdar olmak istiyorum"
- Google ile kayıt (NextAuth — Google Provider)

**Giriş:**
- E-posta + şifre
- "Beni Hatırla" checkbox
- "Şifremi Unuttum" → e-posta ile sıfırlama
- Google ile giriş
- Giriş sonrası → önceki sayfaya veya `/hesabim`'a yönlendir

### 17.3 Hesabım Dashboard: `/hesabim` (MODIFY — Tam Yeniden Yazım)

**Hoşgeldin Kartı:**
- "Hoş geldin, [Ad]!"
- Son giriş tarihi

**Özet Kartları:**
- Aktif siparişler (bekleyen + kargoda)
- Toplam sipariş sayısı
- Favori ürün sayısı
- Kullanılabilir kupon sayısı

**Hızlı Erişim:**
- Son 3 sipariş (tarih, tutar, durum, detay linki)
- "Tüm Siparişlerim" linki

**Menü Navigasyonu (sol sidebar veya üst tab):**
- Siparişlerim
- Adreslerim
- Favorilerim
- İade Taleplerim
- Kuponlarım
- Ürün Yorumlarım
- Hesap Bilgilerim
- Çıkış Yap

### 17.4 Siparişlerim: `/hesabim/siparislerim` (MODIFY — Tam Yeniden Yazım)

**Sipariş Listesi:**
- Kart veya tablo görünümü
- Her sipariş: Sipariş No, Tarih, Ürün Görselleri (thumbnail'lar), Toplam Tutar, Durum Badge
- Durum badge'leri: Bekliyor, Onaylandı, Kargoda, Teslim Edildi, İptal, İade
- "Sipariş Detayı" butonu
- "Tekrar Sipariş Ver" butonu (aynı ürünleri sepete ekle)

**Sipariş Detay: `/hesabim/siparislerim/[id]` (YENİ)**
- Sipariş özet: tarih, sipariş no, toplam tutar
- Ürün listesi: Görsel, Ad, Renk, Beden, Adet, Birim Fiyat, Toplam
  - Her ürün yanında: "Yorum Yap" linki (sadece teslim edildiyse)
  - Her ürün yanında: "İade Talebi" butonu (sadece teslim edildiyse, 14 gün içinde)
- Teslimat adresi
- Ödeme bilgileri (yöntem, son 4 hane)
- Kargo bilgileri:
  - Kargo firması
  - Takip numarası (kopyalanabilir)
  - "Kargo Takip" butonu → yeni sekmede kargo firması takip sayfası
  - Durum timeline: Sipariş Alındı → Hazırlanıyor → Kargoya Verildi → Teslim Edildi
- Fatura indirme (PDF)
- Sipariş iptal butonu (sadece "Bekliyor" durumundaysa)

### 17.5 Adreslerim: `/hesabim/adreslerim` (MODIFY — Tam Yeniden Yazım)

- Adres kartları (grid görünüm)
- Her kart: Başlık ("Ev", "İş"), Ad Soyad, Telefon, Şehir/İlçe, Adres, "Varsayılan" badge
- "Yeni Adres Ekle" butonu
- Her kartta: Düzenle, Sil, Varsayılan Yap butonları
- Adres formu:
  - Adres başlığı (dropdown: Ev, İş, Diğer veya serbest metin)
  - Ad Soyad
  - Telefon
  - İl seçimi (dropdown — Türkiye illeri)
  - İlçe seçimi (dropdown — seçili ile göre filtrelenmiş)
  - Mahalle (isteğe bağlı)
  - Açık adres (textarea)
  - Posta kodu (isteğe bağlı)
- Maks 5 adres limiti

### 17.6 Favorilerim: `/hesabim/favorilerim` (MODIFY — Tam Yeniden Yazım)

- Favori ürünler grid'i (ürün kartı formatında)
- Her kart: Görsel, Ad, Fiyat (indirimli varsa üstü çizili + indirimli), Stok Durumu
- "Sepete Ekle" butonu (renk/beden seçimi ile quick-add modal)
- "Favoriden Çıkar" butonu (kalp ikonu toggle)
- Stok bildirimi: "Stok geldiğinde haber ver" butonu (stok yoksa)
- Boş durum: "Henüz favori ürününüz yok. Keşfetmeye başlayın!" + ürünlere yönlendirme

### 17.7 İade Taleplerim: `/hesabim/iadelerim` (YENİ)

**İade Listesi:**
- Tablo: İade No, Sipariş No, Ürün, Neden, Durum, Tarih
- Durum badge'leri: Bekliyor, Onaylandı, Reddedildi, Kargo Edildi, Tamamlandı, İade Edildi

**Yeni İade Talebi:**
- Sipariş seçimi (son 14 gün içindeki teslim edilen siparişler)
- Ürün seçimi (o siparişten hangi ürün/ürünler)
- İade nedeni seçimi:
  - Beden uygun değil
  - Ürün kusurlu/hasarlı
  - Yanlış ürün gönderilmiş
  - Ürün beklentimi karşılamadı
  - Diğer (açıklama zorunlu)
- Açıklama textarea
- Fotoğraf yükleme (kusurlu ürün için — isteğe bağlı)
- Gönder butonu

**İade Detay:**
- İade durumu timeline
- Admin yanıtı (onay/red nedeni)
- Onaylandıysa: İade kargo kodu (otomatik oluşturulur)
- Kargo teslim durumu
- İade tutarı ve ödeme durumu

### 17.8 Kuponlarım: `/hesabim/kuponlarim` (YENİ)

- Aktif kuponlar listesi (kod, açıklama, indirim tutarı/oranı, son kullanma tarihi)
- Kullanılmış kuponlar (gri, üstü çizili)
- Süresi dolmuş kuponlar
- Kupon kodu girişi: "Kupon kodunuz varsa buraya girin" input + "Ekle" butonu

### 17.9 Ürün Yorumlarım: `/hesabim/yorumlarim` (YENİ)

- Yazılmış yorumlar listesi (ürün görseli, ürün adı, puan yıldızları, yorum metni, tarih, durum)
- Durum: Onay Bekliyor, Yayında, Reddedildi
- "Yorumu Düzenle" butonu (sadece onay bekleyenler)
- Yorum yazılabilecek ürünler: Teslim edilmiş, henüz yorumlanmamış siparişlerden ürünler
- Her yorum yazılabilecek ürün kartında: "Yorum Yap" butonu → rating (1-5 yıldız) + başlık + yorum textarea

### 17.10 Hesap Bilgilerim: `/hesabim/bilgilerim` (YENİ)

**Kişisel Bilgiler:**
- Ad, soyad düzenleme
- E-posta (read-only — değişiklik için destek talebi)
- Telefon düzenleme
- Doğum tarihi
- Cinsiyet seçimi

**Şifre Değiştirme:**
- Mevcut şifre
- Yeni şifre (güç göstergesi)
- Yeni şifre tekrar
- "Şifreyi Güncelle" butonu

**Bildirim Tercihleri:**
- E-posta bildirimleri toggle: Sipariş güncellemeleri
- E-posta bildirimleri toggle: Kampanya ve indirimler
- SMS bildirimleri toggle: Kargo bildirimleri

**Hesap İşlemleri:**
- "Hesabımı Sil" butonu (KVKK gereği — onay diyaloğu ile)
- Hesap silme: Kişisel verilerin silinmesi, siparişler anonim hale getirilir

### 17.11 Frontend Ürün Detay Sayfasına Eklemeler (MODIFY)

Mevcut ürün detay sayfasına entegre edilecek:

**Favori Butonu:**
- Kalp ikonu (ürün görseli yanında veya üstünde)
- Giriş yapılmamışsa → giriş sayfasına yönlendir
- Giriş yapılmışsa → favori toggle

**Ürün Yorumları Bölümü:**
- Ortalama puan (yıldız gösterimi + sayısal değer)
- Toplam yorum sayısı
- Yorum listesi (yıldız, başlık, yorum, tarih, yazan kişi adı)
- Pagination (sayfa başı 5 yorum)
- "Yorum Yap" butonu (giriş yapmış + bu ürünü almış kullanıcılar için)

**Stok Bildirimi:**
- Stok yoksa: "Stok geldiğinde haber ver" butonu + e-posta input

### 17.12 Ödeme Sayfası Geliştirmesi: `/odeme` (MODIFY)

Mevcut ödeme akışını kontrol et ve eksikleri ekle:

**Adım 1 — Teslimat Bilgileri:**
- Kayıtlı adres seçimi (radio button ile)
- "Yeni Adres Ekle" butonu (modal)
- Fatura adresi: "Teslimat adresi ile aynı" checkbox veya farklı adres seçimi
- Bireysel / Kurumsal fatura seçimi
  - Kurumsal: Firma ünvanı, vergi dairesi, vergi no

**Adım 2 — Kargo Seçimi:**
- Standart kargo (Geliver) — tahmini teslimat süresi
- Kargo ücreti gösterimi
- Ücretsiz kargo eşiği gösterimi: "X₺ daha ekleyin, kargo ücretsiz!"

**Adım 3 — Ödeme:**
- Kredi/Banka kartı (iyzico) — kart bilgileri formu
- Taksit seçenekleri tablosu (banka bazlı)
- Havale/EFT — banka bilgileri gösterimi
- Kapıda ödeme (aktifse)
- Kupon kodu girişi

**Adım 4 — Sipariş Özeti & Onay:**
- Ürün listesi (görsel, ad, renk, beden, adet, fiyat)
- Ara toplam
- Kupon indirimi (varsa)
- Kargo ücreti
- **Toplam tutar**
- "Ön Bilgilendirme Formu" checkbox (zorunlu)
- "Mesafeli Satış Sözleşmesi" checkbox (zorunlu)
- "Siparişi Onayla ve Öde" butonu
- Ödeme sonrası → Sipariş onay sayfası (sipariş no, özet, tahmini teslimat)

### 17.13 Doğrulama Checklist

- [ ] Kayıt formu KVKK checkbox ile çalışıyor
- [ ] Google ile kayıt/giriş çalışıyor
- [ ] Hesabım dashboard doğru veriler gösteriyor
- [ ] Sipariş listesi ve detay doğru
- [ ] Sipariş tekrar verme çalışıyor
- [ ] Adres CRUD çalışıyor (ekle, düzenle, sil, varsayılan yap)
- [ ] İl-ilçe dropdown bağımlı çalışıyor
- [ ] Favoriler toggle çalışıyor (ekle/çıkar)
- [ ] İade talebi oluşturulabiliyor
- [ ] İade durumu takip edilebiliyor
- [ ] Kupon listesi ve kupon kodu girişi çalışıyor
- [ ] Ürün yorumu yazılabiliyor (puan + metin)
- [ ] Yorumlar ürün detay sayfasında görünüyor (admin onayından sonra)
- [ ] Hesap bilgileri güncellenebiliyor
- [ ] Şifre değiştirme çalışıyor
- [ ] Hesap silme (KVKK) çalışıyor
- [ ] Ödeme akışı tüm adımlarıyla çalışıyor
- [ ] Taksit tablosu doğru gösteriliyor
- [ ] Sözleşme checkbox'ları zorunlu çalışıyor
- [ ] Build başarılı

---

## UYGULAMA SIRASI VE BAĞIMLILIKLAR

```
FAZ 1  (Site Ayarları)          ← Bağımlılık yok, ilk yapılmalı
FAZ 2  (Ürün Yönetimi)          ← Faz 1'e bağımlı (ayarlar altyapısı)
FAZ 3  (Slider/Banner)          ← Bağımlılık yok
FAZ 4  (Sipariş Yönetimi)       ← Faz 2'ye bağımlı (maliyet fiyatı)
FAZ 5  (Fatura & Raporlama)     ← Faz 4'e bağımlı (sipariş verileri)
FAZ 6  (Bayi Admin Yönetimi)    ← Faz 2'ye bağımlı (fiyatlandırma)
FAZ 7  (Google Merchant)        ← Faz 2'ye bağımlı (GTIN, ürün bilgileri)
FAZ 8  (E-posta Yönetimi)       ← Faz 4'e bağımlı (sipariş e-postaları)
FAZ 9  (Üretim Planlama)        ← Faz 2 ve 5'e bağımlı
FAZ 10 (CMS - Blog/Sayfa)       ← Bağımlılık yok
FAZ 11 (Kullanıcı Yönetimi)     ← Bağımlılık yok ama erken yapılmalı
FAZ 12 (Kampanya Sistemi)       ← Faz 2'ye bağımlı
FAZ 13 (AI Chatbot)             ← Faz 1'e bağımlı (system prompt ayarı)
FAZ 14 (SEO Araçları)           ← Faz 1 ve 2'ye bağımlı
FAZ 15 (Dashboard)              ← Tüm fazlara bağımlı, en son yapılmalı
FAZ 16 (Bayi Paneli Frontend)   ← Faz 6'ya bağımlı (bayi altyapısı + fiyatlandırma)
FAZ 17 (Müşteri Paneli)         ← Faz 2, 4 ve 12'ye bağımlı
```

**Önerilen Uygulama Sırası:**
1 → 2 → 3 → 11 → 4 → 5 → 6 → 16 → 17 → 7 → 8 → 12 → 10 → 9 → 13 → 14 → 15

> **NOT:** Faz 6 (Bayi Admin) ve Faz 16 (Bayi Panel) arka arkaya yapılmalı.
> Faz 17 (Müşteri Panel) sipariş ve ürün altyapısı hazır olduktan sonra yapılmalı.

---

## TOPLAM DOSYA ÖZETİ

| Aksiyon | Dosya Sayısı |
|---------|-------------|
| Yeni Admin Sayfaları | ~22 sayfa |
| Yeni Bayi Panel Sayfaları | ~8 sayfa |
| Yeni Müşteri Panel Sayfaları | ~10 sayfa |
| Yeni API Route'ları | ~35 route |
| Yeni Component'ler | ~45 component |
| Mevcut Dosya Modify | ~25 dosya |
| Prisma Schema Güncellemesi | 1 dosya (çoklu model) |
| Migration | Her faz için ayrı |

**Toplam Tahmini Süre:** 110-140 saat (17 faz)

---

## CLAUDE MAX İÇİN ZORUNLU KURALLAR

1. **Her faz başında önce Prisma schema değişikliğini yap ve migration çalıştır**
2. **Mock data kullanma — gerçek DB sorguları yaz**
3. **Her sayfada loading state, error state ve empty state olacak**
4. **Her formda Zod validation olacak**
5. **Her tablo sayfasında pagination, arama ve filtre olacak**
6. **Her API route'ta session/yetki kontrolü olacak**
7. **Dosya yükleme yerlerinde boyut bilgisi label'ı göster (px x px, maks KB)**
8. **Her fazın sonunda build al ve test checklist'ini doğrula**
9. **Türkçe UI — tüm metin Türkçe olacak**
10. **Mevcut tasarım diline uy — yeni UI kütüphanesi ekleme**

### Bayi Paneli Özel Kuralları

11. **Bayi panelinde SON KULLANICIYA SATIŞ özelliği OLMAYACAK** — vitrin yok, müşteri yok
12. **Bayi fiyatları her zaman iskontolu gösterilecek** — perakende fiyat sadece referans (üstü çizili)
13. **Düzine bazlı sipariş kontrolü her sepet işleminde yapılacak** — 12'nin katı olmayan adetler uyarı verecek
14. **Cari limit kontrolü sipariş onayında zorunlu** — limit aşılırsa sipariş engellenir
15. **Cari hesap hareketleri atomik olacak** — sipariş oluşturma ve borç kaydı aynı transaction'da

### Müşteri Paneli Özel Kuralları

16. **KVKK onayı olmadan kayıt yapılamaz** — checkbox zorunlu, tarih kaydedilecek
17. **Ödeme sayfasında sözleşme checkbox'ları zorunlu** — Ön Bilgilendirme + Mesafeli Satış
18. **İade talebi sadece teslim edilen siparişler için açılabilir** — 14 gün sınırı
19. **Ürün yorumu sadece satın alınmış ürünler için yazılabilir** — sahte yorum engeli
20. **Hesap silme KVKK gereği çalışmalı** — kişisel veriler silinir, siparişler anonimleşir
