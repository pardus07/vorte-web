# Vorte.com.tr E-Ticaret Sitesi — Teknik Döküm ve Sunucu Bilgileri

## 1. Mevcut Sunucu Altyapısı

### VDS Sunucu Bilgileri
- **Sağlayıcı:** Hosting Dünyam (İstanbul)
- **Sunucu IP:** 188.132.198.81
- **İşletim Sistemi:** Linux (Ubuntu/Debian)
- **SSH Erişimi:** root@188.132.198.81 (SSH key ile şifresiz bağlantı)
- **Mevcut Site:** yemeksorai.com (bu sunucuda çalışıyor)

### Coolify (CI/CD ve Hosting Platformu)
- **Versiyon:** v4.0.0-beta.463
- **Panel URL:** http://188.132.198.81:8000
- **Reverse Proxy:** Traefik (otomatik SSL/TLS)
- **Deploy Yöntemi:** GitHub repo bağlantısı → git push → otomatik veya manuel redeploy
- **SSL:** Let's Encrypt (Traefik üzerinden otomatik)

### Mevcut Proje (yemeksorai.com) Nasıl Çalışıyor
1. Kod GitHub'a push edilir: `github.com/pardus07/yemeksorai-web`
2. Coolify panelinden Redeploy tetiklenir (veya otomatik)
3. Coolify, Dockerfile'ı kullanarak Docker image build eder
4. Container port 3000'de çalışır
5. Traefik reverse proxy, domain'i container'a yönlendirir
6. SSL sertifikası otomatik alınır

### Coolify'da Yeni Proje (vorte.com.tr) Ekleme
1. Coolify panelinde "New Project" veya mevcut projeye "New Application" ekle
2. GitHub reposunu bağla
3. Domain olarak `vorte.com.tr` ve `www.vorte.com.tr` ekle
4. Environment Variables ekle
5. Dockerfile ile build et
6. Traefik otomatik SSL verecek

### DNS Ayarları (vorte.com.tr)
Domain'in DNS kayıtlarına şunlar eklenmeli:
```
A     @              188.132.198.81
A     www            188.132.198.81
CNAME www            vorte.com.tr
```

---

## 2. Vorte.com.tr Proje Gereksinimleri

### Proje Tanımı
Vorte Tekstil Toptan — Online e-ticaret sitesi. Hem perakende hem toptan satış yapılacak. Türkiye merkezli tekstil ürünleri satışı.

### İşletme Bilgileri
- **Şirket:** Vorte Tekstil Toptan
- **Lokasyon:** Nilüfer/Bursa, Türkiye
- **Google Haritalar:** Dükkan zaten kayıtlı
- **İletişim:** iletisim@vorte.com.tr (kurulacak)

---

## 3. Teknik Stack Önerisi

### Framework
- **Next.js 16** (App Router) + TypeScript + Tailwind CSS 4
- Aynı yemeksorai.com'daki stack, sunucu uyumluluğu garantili
- `output: "standalone"` ile Docker container

### Veritabanı
- **PostgreSQL** (Coolify üzerinde veya ayrı container) — Ürünler, siparişler, kullanıcılar, stok
- **Prisma ORM** — Type-safe veritabanı sorguları

### Kimlik Doğrulama (Auth)
- **NextAuth.js (Auth.js)** — Email/şifre + Google + telefon ile giriş
- Müşteri hesabı sistemi (kayıt, giriş, profil, adres yönetimi)

### Ödeme Altyapısı — iyzico
- **iyzico API Entegrasyonu**
- Kredi kartı / banka kartı ile ödeme
- 3D Secure desteği
- Taksit seçenekleri
- İade/iade süreci yönetimi
- iyzico sandbox (test) ve production ortamları
- **Gerekli:** iyzico merchant hesabı, API key ve secret key
- **iyzico Node.js SDK:** `iyzipay` npm paketi
- Webhook entegrasyonu (ödeme onayı bildirimleri)

### Kargo Altyapısı — Geliver
- **Geliver API entegrasyonu** (https://geliver.com)
- Geliver çoklu kargo firması desteği sunar (Aras, Yurtiçi, MNG, Sürat vb.)
- Sipariş sonrası otomatik kargo etiketi oluşturma
- Kargo takip numarası müşteriye otomatik bildirim
- Kargo ücret hesaplama (desi/kg bazlı)
- Geliver webhook ile kargo durum güncellemeleri

### E-Fatura — DIA Yazılım Entegrasyonu
- **DIA CRM/ERP Yazılımı** ile API entegrasyonu
- Sipariş tamamlandığında DIA'ya otomatik fatura bilgisi gönderimi
- DIA üzerinden e-fatura/e-arşiv fatura kesilmesi
- Fatura PDF'inin müşteriye otomatik email ile gönderimi
- **Gerekli bilgiler:**
  - DIA API endpoint URL'leri
  - DIA API key / authentication bilgileri
  - DIA'daki ürün kodları eşleştirmesi
  - Fatura serisi ve numara formatı
- **Akış:** Sipariş Onayı → iyzico Ödeme Onayı → DIA'ya Fatura Bilgisi Gönder → DIA e-Fatura Kes → Müşteriye Email Gönder

---

## 4. Sayfa Yapısı ve Özellikler

### Müşteri Tarafı (Frontend)
```
/                       → Ana sayfa (hero, öne çıkan ürünler, kategoriler)
/urunler                → Tüm ürünler listesi (filtreleme, sıralama)
/urunler/[kategori]     → Kategori sayfası
/urun/[slug]            → Ürün detay (görseller, fiyat, beden, stok, sepete ekle)
/sepet                  → Alışveriş sepeti
/odeme                  → Ödeme sayfası (iyzico entegrasyonu)
/odeme/basarili         → Başarılı ödeme sayfası
/odeme/basarisiz        → Başarısız ödeme sayfası
/hesabim                → Kullanıcı paneli
/hesabim/siparislerim   → Sipariş geçmişi ve takip
/hesabim/adreslerim     → Adres yönetimi
/hesabim/favorilerim    → Favori ürünler
/toptan                 → Toptan satış bilgileri ve başvuru
/hakkimizda             → Şirket hakkında
/iletisim               → İletişim formu ve bilgileri
/blog                   → Blog (SEO için)
/gizlilik-politikasi    → Gizlilik politikası
/kullanim-kosullari     → Kullanım koşulları
/iade-politikasi        → İade ve değişim politikası
/kvkk                   → KVKK aydınlatma metni
/mesafeli-satis         → Mesafeli satış sözleşmesi
```

### Admin Paneli
```
/admin                      → Dashboard (günlük satış, sipariş özeti)
/admin/urunler              → Ürün yönetimi (CRUD)
/admin/urunler/yeni         → Yeni ürün ekle
/admin/urunler/[id]         → Ürün düzenle
/admin/kategoriler          → Kategori yönetimi
/admin/siparisler           → Sipariş listesi ve yönetimi
/admin/siparisler/[id]      → Sipariş detayı (kargo, fatura durumu)
/admin/musteriler           → Müşteri listesi
/admin/kargo                → Kargo yönetimi
/admin/faturalar            → Fatura listesi (DIA entegrasyonu)
/admin/toptan               → Toptan müşteri başvuruları
/admin/kuponlar             → İndirim kuponu yönetimi
/admin/ayarlar              → Site ayarları (kargo ücreti, ödeme, vb.)
```

### Temel E-Ticaret Özellikleri
- **Ürün Yönetimi:** Çoklu görsel, beden/renk varyantları, stok takibi
- **Sepet:** Session bazlı + kullanıcı bazlı sepet
- **Arama:** Ürün arama ve filtreleme (fiyat, beden, renk, kategori)
- **Favori:** Beğenilen ürünleri kaydetme
- **Kupon:** İndirim kuponu sistemi
- **Toptan Satış:** Adet bazlı fiyat kademeleri (10+ adet %10, 50+ adet %20 gibi)
- **Stok Yönetimi:** Beden/renk bazlı stok takibi, stok uyarıları

---

## 5. Sipariş Akışı (End-to-End)

```
1. Müşteri ürün seçer → Sepete ekler
2. Sepeti onaylar → Teslimat adresi girer
3. Kargo seçeneği belirlenir (otomatik ücret hesabı)
4. iyzico ödeme sayfası açılır (3D Secure)
5. Ödeme başarılı → Sipariş oluşturulur (DB'ye kayıt)
6. DIA Yazılımına API ile fatura bilgisi gönderilir
7. DIA otomatik e-fatura/e-arşiv keser
8. Fatura PDF müşteriye email ile gönderilir
9. Kargo firması API'sine gönderim bildirimi yapılır
10. Kargo takip numarası müşteriye SMS/email ile gönderilir
11. Müşteri /hesabim/siparislerim'den takip eder
```

---

## 6. Veritabanı Şeması (Temel Tablolar)

```
users           → id, email, name, phone, role (customer/wholesale/admin), createdAt
addresses       → id, userId, title, fullName, phone, city, district, address, zipCode
categories      → id, name, slug, image, parentId
products        → id, name, slug, description, categoryId, basePrice, wholesalePrice, images[], active
variants        → id, productId, size, color, stock, sku, price (override)
orders          → id, userId, status, totalAmount, shippingCost, addressId, cargoTrackingNo
order_items     → id, orderId, productId, variantId, quantity, unitPrice
payments        → id, orderId, iyzicoPaymentId, status, amount, paidAt
invoices        → id, orderId, diaInvoiceId, invoiceNo, status, pdfUrl, sentAt
coupons         → id, code, discountType, discountValue, minAmount, expiresAt, active
favorites       → id, userId, productId
cart_items      → id, sessionId, userId, productId, variantId, quantity
```

---

## 7. Entegrasyon Detayları

### iyzico Ödeme Entegrasyonu
```
Paket: npm install iyzipay
Test URL: https://sandbox-api.iyzipay.com
Prod URL: https://api.iyzipay.com
Webhook: /api/webhooks/iyzico (ödeme sonucu callback)

Gerekli ENV:
IYZICO_API_KEY=sandbox-xxxxx
IYZICO_SECRET_KEY=sandbox-xxxxx
IYZICO_BASE_URL=https://sandbox-api.iyzipay.com (test)
```

### Kargo API Entegrasyonu — Geliver
```
Platform: Geliver (https://geliver.com)
Çoklu kargo firması desteği (Aras, Yurtiçi, MNG, Sürat vb.)
Geliver API dokümantasyonu üzerinden entegrasyon yapılacak.

Gerekli ENV:
GELIVER_API_KEY=xxxxx
GELIVER_API_SECRET=xxxxx
GELIVER_API_URL=https://api.geliver.com (Geliver'ın verdiği endpoint)
```

### DIA Yazılım E-Fatura Entegrasyonu
```
DIA API ile bağlantı:
- Sipariş bilgisi gönderme
- Fatura oluşturma
- Fatura durumu sorgulama
- Fatura PDF alma

Gerekli ENV:
DIA_API_URL=https://api.dia.com.tr (veya DIA'nın verdiği endpoint)
DIA_API_KEY=xxxxx
DIA_COMPANY_ID=xxxxx
DIA_INVOICE_SERIES=VRT

Akış:
POST /api/dia/create-invoice → DIA'da fatura oluştur
GET  /api/dia/invoice-status/[id] → Fatura durumunu sorgula
GET  /api/dia/invoice-pdf/[id] → Fatura PDF'ini al
POST /api/dia/send-invoice/[id] → Müşteriye email gönder
```

### Email Servisi
```
Seçenekler:
1. Resend (tavsiye — Next.js uyumlu)
2. Nodemailer + SMTP

Kullanım alanları:
- Sipariş onayı
- Fatura gönderimi
- Kargo bilgilendirmesi
- Şifre sıfırlama
- Hoş geldin maili

Gerekli ENV:
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=siparis@vorte.com.tr
```

---

## 8. Docker ve Deploy Yapısı

### Dockerfile (YemekSorAI ile aynı yapı)
```dockerfile
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat

FROM base AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Build args
ARG DATABASE_URL
ARG IYZICO_API_KEY
ARG IYZICO_SECRET_KEY
# ... diğer env'ler

ENV DATABASE_URL=$DATABASE_URL
ENV IYZICO_API_KEY=$IYZICO_API_KEY
# ...

RUN npx prisma generate
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
```

### Coolify Ayarları
- **GitHub Repo:** bağlanacak
- **Domain:** vorte.com.tr, www.vorte.com.tr
- **Port:** 3000
- **SSL:** Otomatik (Let's Encrypt via Traefik)
- **Environment Variables:** Coolify panelinden eklenir
- **Persistent Storage:** Ürün görselleri için volume mount gerekebilir

### PostgreSQL (Coolify'da)
Coolify panelinden "New Resource" → PostgreSQL eklenebilir. Aynı sunucuda Docker container olarak çalışır.

```
DATABASE_URL=postgresql://vorte:password@localhost:5432/vorte_db
```

---

## 9. Gerekli Environment Variables (Tamamı)

```env
# Veritabanı
DATABASE_URL=postgresql://vorte:xxxxx@postgres:5432/vorte_db

# NextAuth
NEXTAUTH_URL=https://www.vorte.com.tr
NEXTAUTH_SECRET=xxxxx

# iyzico Ödeme
IYZICO_API_KEY=xxxxx
IYZICO_SECRET_KEY=xxxxx
IYZICO_BASE_URL=https://api.iyzipay.com

# Kargo (Geliver)
GELIVER_API_KEY=xxxxx
GELIVER_API_SECRET=xxxxx
GELIVER_API_URL=https://api.geliver.com

# DIA E-Fatura
DIA_API_URL=xxxxx
DIA_API_KEY=xxxxx
DIA_COMPANY_ID=xxxxx
DIA_INVOICE_SERIES=VRT

# Email
RESEND_API_KEY=xxxxx
EMAIL_FROM=siparis@vorte.com.tr

# Upload (ürün görselleri)
UPLOAD_DIR=/app/uploads
# veya Cloudinary/S3 kullanılabilir
CLOUDINARY_URL=cloudinary://xxxxx

# Site
NEXT_PUBLIC_SITE_URL=https://www.vorte.com.tr
NEXT_PUBLIC_SITE_NAME=Vorte Tekstil
```

---

## 10. Önemli Notlar

1. **Aynı sunucu:** vorte.com.tr, yemeksorai.com ile aynı VDS'te çalışacak. Coolify birden fazla uygulamayı yönetebilir. Traefik domain bazlı routing yapar.

2. **DNS:** vorte.com.tr domain'inin A kaydı 188.132.198.81 IP'sine yönlendirilmeli.

3. **DIA Entegrasyonu:** DIA yazılımının API dokümantasyonuna ihtiyaç var. API endpoint'leri, authentication yöntemi ve request/response formatları DIA'dan alınmalı.

4. **iyzico:** Önce sandbox hesabı ile test edilmeli, sonra production'a geçilmeli.

5. **E-Fatura Yasal Gereksinimler:** E-fatura/e-arşiv fatura mükellefliği olmalı. DIA üzerinden GİB (Gelir İdaresi Başkanlığı) entegrasyonu sağlanmalı.

6. **Mesafeli Satış Sözleşmesi:** E-ticaret için yasal zorunluluk. Ödeme öncesi müşteriye gösterilmeli ve onay alınmalı.

7. **KVKK:** Müşteri verilerinin işlenmesi için aydınlatma metni ve açık rıza gerekli.

8. **Toptan Satış:** B2B müşteriler için ayrı fiyat listesi, minimum sipariş miktarı ve fatura tipi (e-fatura vs e-arşiv) yönetimi gerekli.

9. **Coolify Persistent Storage:** Ürün görselleri için volume mount yapılmalı (yemeksorai'daki APK mount'u gibi: /opt/vorte-uploads → /app/uploads).

10. **PostgreSQL Backup:** Veritabanı yedekleme planı oluşturulmalı (günlük otomatik backup).
