/**
 * Ürün açıklaması sanitizer — HTML tag'lerini temizler ve düz metin formatına çevirir.
 *
 * AI Agent (Gemini) bazen HTML tag'leri (<p>, <b>, <br>, <h2>, <ul>, <li> vb.) kullanarak
 * ürün açıklaması yazar. Bu fonksiyon:
 * 1. HTML tag'lerini anlamlı plain text karşılıklarına çevirir
 * 2. Gereksiz boşlukları ve fazla satır boşluklarını temizler
 * 3. Sonuçta her zaman düz metin (plain text) döndürür
 *
 * Vorte ürün açıklama formatı:
 * - Başlıklar: BÜYÜK HARF (HTML tag yok)
 * - Paragraflar arası: \n\n (çift satır boşluğu)
 * - Madde işaretleri: "* •" veya "•" karakterleri
 * - Beden rehberi: "• S (36-38): Bel 76–82 cm" formatı
 * - HTML tag kesinlikle YASAK
 */

export function sanitizeProductDescription(text: string): string {
  if (!text) return text;

  let result = text;

  // ── 1. Blok seviye HTML tag'lerini satır boşluklarına çevir ──
  // <br> ve <br/> → satır sonu
  result = result.replace(/<br\s*\/?>/gi, "\n");

  // </p>, </div>, </h1-6>, </li>, </tr> → çift satır boşluğu
  result = result.replace(/<\/(?:p|div|h[1-6]|section|article)>/gi, "\n\n");

  // </li> → satır sonu (liste elemanları arası)
  result = result.replace(/<\/li>/gi, "\n");

  // </ul>, </ol> → çift satır boşluğu
  result = result.replace(/<\/(?:ul|ol)>/gi, "\n\n");

  // </tr> → satır sonu (tablo satırları)
  result = result.replace(/<\/tr>/gi, "\n");

  // <li> → "* •" madde işareti
  result = result.replace(/<li[^>]*>/gi, "* •");

  // <td>, <th> → " | " (tablo hücreleri arası ayırıcı)
  result = result.replace(/<\/(?:td|th)>\s*<(?:td|th)[^>]*>/gi, " | ");

  // ── 2. Kalan tüm HTML tag'lerini sil ──
  result = result.replace(/<[^>]+>/g, "");

  // ── 3. HTML entity'leri decode et ──
  result = result.replace(/&amp;/g, "&");
  result = result.replace(/&lt;/g, "<");
  result = result.replace(/&gt;/g, ">");
  result = result.replace(/&quot;/g, '"');
  result = result.replace(/&#39;/g, "'");
  result = result.replace(/&nbsp;/g, " ");
  result = result.replace(/&ndash;/g, "–");
  result = result.replace(/&mdash;/g, "—");
  result = result.replace(/&bull;/g, "•");
  result = result.replace(/&#(\d+);/g, (_match, code) =>
    String.fromCharCode(parseInt(code, 10))
  );

  // ── 4. Boşluk temizliği ──
  // Satır başı/sonu boşlukları temizle
  result = result.replace(/[ \t]+$/gm, "");
  result = result.replace(/^[ \t]+/gm, (match) => {
    // Madde işaretli satırlarda indentation'ı koru
    return match;
  });

  // 3'ten fazla ardışık boş satırı 2'ye indir
  result = result.replace(/\n{4,}/g, "\n\n\n");

  // Başta ve sondaki boşlukları temizle
  result = result.trim();

  return result;
}
