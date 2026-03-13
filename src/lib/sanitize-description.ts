/**
 * Ürün açıklaması sanitizer + format enforcer
 *
 * Gemini (AI Agent) iki tür hata yapıyor:
 * 1. HTML tag kullanma (<p>, <b>, <br> vb.)
 * 2. Satır düzenini bozma (her şeyi tek satıra yapıştırma)
 *
 * Bu fonksiyon her iki sorunu da çözer:
 * - Adım 1: HTML tag'lerini temizle
 * - Adım 2: Satır düzenini zorla (section başlıkları, madde işaretleri, SSS)
 *
 * DOĞRU FORMAT ÖRNEĞİ:
 * ─────────────────────
 * Vorte Premium Penye Erkek Boxer Siyah, %95 taranmış...
 *
 * TARANMIŞ PENYE PAMUK NEDİR VE NEDEN ÖNEMLİDİR?
 *
 * Taranmış penye pamuk, standart pamuktan farklı olarak...
 *
 * TEKNİK ÖZELLİKLER
 *
 * * •Kumaş: %95 Taranmış Penye Pamuk + %5 Elastan
 * * •Gramaj: 160–170 gr/m²
 *
 * BEDEN REHBERİ
 *
 * • S (36-38): Bel 76–82 cm • M (38-40): Bel 83–89 cm ...
 *
 * BAKIM TALİMATLARI
 *
 * * •30°C'de makine yıkama yapılabilir
 * * •Çamaşır suyu kullanmayın
 *
 * SIKÇA SORULAN SORULAR
 *
 * Soru? Cevap cümlesi.
 *
 * Soru? Cevap cümlesi.
 */

// ── Bilinen bölüm başlıkları (BÜYÜK HARF) ──
// Soru işareti olan başlıklar regex ile aranacak (? opsiyonel)
const FIXED_SECTION_HEADERS = [
  "TEKNİK ÖZELLİKLER",
  "BEDEN REHBERİ",
  "BAKIM TALİMATLARI",
  "SIKÇA SORULAN SORULAR",
];

// Regex ile yakalanacak başlıklar (? dahil tüm başlığı yakala)
const REGEX_SECTION_HEADERS = [
  // "TARANMIŞ PENYE PAMUK NEDİR VE NEDEN ÖNEMLİDİR?"
  /TARANMIŞ PENYE PAMUK NEDİR VE NEDEN ÖNEMLİDİR\??/g,
  // "SİYAH ERKEK BOXER KİMLER İÇİN İDEAL?" vb.
  /[A-ZÇĞIİÖŞÜ][A-ZÇĞIİÖŞÜ\s]{8,}KİMLER İÇİN İDEAL\??/g,
];

/**
 * Ana fonksiyon: HTML temizle + satır düzenini zorla
 */
export function sanitizeProductDescription(text: string): string {
  if (!text || text.trim().length === 0) return text;

  let result = text;

  // ═══════════════════════════════════════════
  // ADIM 1: HTML TEMİZLİĞİ
  // ═══════════════════════════════════════════
  result = stripHtml(result);

  // ═══════════════════════════════════════════
  // ADIM 2: SATIR DÜZENİ ENFORCER
  // ═══════════════════════════════════════════
  result = enforceLineBreaks(result);

  return result.trim();
}

// ──────────────────────────────────────────────
// ADIM 1: HTML Temizliği
// ──────────────────────────────────────────────
function stripHtml(text: string): string {
  let r = text;

  // Block-level kapanış tag'leri → çift satır boşluğu
  r = r.replace(/<\/(?:p|div|h[1-6]|section|article)>/gi, "\n\n");
  r = r.replace(/<\/(?:ul|ol)>/gi, "\n\n");

  // <br> → satır sonu
  r = r.replace(/<br\s*\/?>/gi, "\n");

  // <li> → "* •" madde işareti + </li> → satır sonu
  r = r.replace(/<li[^>]*>/gi, "\n* •");
  r = r.replace(/<\/li>/gi, "");

  // </tr> → satır sonu
  r = r.replace(/<\/tr>/gi, "\n");

  // <td>/<th> arası → " | "
  r = r.replace(/<\/(?:td|th)>\s*<(?:td|th)[^>]*>/gi, " | ");

  // Kalan tüm HTML tag'leri sil
  r = r.replace(/<[^>]+>/g, "");

  // HTML entity decode
  r = r.replace(/&amp;/g, "&");
  r = r.replace(/&lt;/g, "<");
  r = r.replace(/&gt;/g, ">");
  r = r.replace(/&quot;/g, '"');
  r = r.replace(/&#39;/g, "'");
  r = r.replace(/&nbsp;/g, " ");
  r = r.replace(/&ndash;/g, "–");
  r = r.replace(/&mdash;/g, "—");
  r = r.replace(/&bull;/g, "•");
  r = r.replace(/&#(\d+);/g, (_m, code) =>
    String.fromCharCode(parseInt(code, 10))
  );

  return r;
}

// ──────────────────────────────────────────────
// ADIM 2: Satır Düzeni Enforcer
// ──────────────────────────────────────────────
function enforceLineBreaks(text: string): string {
  let r = text;

  // ── 2a. Bölüm başlıklarının önüne ve arkasına \n\n ekle ──

  // Sabit başlıklar (TEKNİK ÖZELLİKLER, BEDEN REHBERİ, vb.)
  for (const header of FIXED_SECTION_HEADERS) {
    const headerEscaped = escapeRegex(header);
    // Başlığın önüne \n\n ekle (yoksa)
    r = r.replace(
      new RegExp(`(?<!\n\n)(${headerEscaped})`, "g"),
      "\n\n$1"
    );
    // Başlığın arkasına \n\n ekle (yoksa)
    r = r.replace(
      new RegExp(`(${headerEscaped})(?!\n)`, "g"),
      "$1\n\n"
    );
  }

  // Regex başlıklar ("TARANMIŞ PENYE PAMUK NEDİR...?", "XXX KİMLER İÇİN İDEAL?")
  for (const pattern of REGEX_SECTION_HEADERS) {
    // Başlığı bul, etrafına \n\n koy
    r = r.replace(pattern, (match) => `\n\n${match}\n\n`);
  }

  // ── 2b. TEKNİK ÖZELLİKLER ve BAKIM TALİMATLARI bölümlerinde ──
  //    tek satırdaki "• X" maddelerini ayrı satırlara böl
  r = formatBulletSection(r, "TEKNİK ÖZELLİKLER", "BEDEN REHBERİ");
  r = formatBulletSection(r, "BAKIM TALİMATLARI", "SIKÇA SORULAN SORULAR");

  // ── 2c. SSS bölümünde soru-cevap çiftlerini ayrı paragraflara böl ──
  r = formatSSSSection(r);

  // ── 2d. Temizlik ──
  // Satır başı/sonu boşlukları temizle
  r = r.replace(/[ \t]+$/gm, "");
  r = r.replace(/^[ \t]+/gm, "");

  // 3'ten fazla ardışık \n'i \n\n'e indir
  r = r.replace(/\n{3,}/g, "\n\n");

  return r;
}

/**
 * Madde işaretli bölümü formatla:
 * Tek satırdaki "• X • Y • Z" → her biri kendi satırında "* •X\n* •Y\n* •Z"
 *
 * startHeader ile endHeader arasındaki metni işler.
 * BEDEN REHBERİ bölümünde "•" maddeleri tek satırda kalır (bu bölüm hariç).
 */
function formatBulletSection(
  text: string,
  startHeader: string,
  endHeader: string
): string {
  const startIdx = text.indexOf(startHeader);
  if (startIdx === -1) return text;

  const afterHeader = startIdx + startHeader.length;
  const endIdx = text.indexOf(endHeader, afterHeader);
  const sectionEnd = endIdx === -1 ? text.length : endIdx;

  const before = text.slice(0, afterHeader);
  const section = text.slice(afterHeader, sectionEnd);
  const after = text.slice(sectionEnd);

  // Section içindeki bullet'ları düzenle
  let formatted = section;

  // Eğer section içinde hiç \n yoksa veya "•" aralarında \n yoksa
  // → tek satırda yazılmış demektir, böl
  // Pattern: "• Kumaş: ..." veya "* •Kumaş: ..."

  // Önce mevcut "* •" veya "•" maddelerini tespit et
  // Tek satırdaki birden fazla "•" var mı kontrol et
  const bulletCount = (formatted.match(/•/g) || []).length;
  const lineCount = formatted.split("\n").filter((l) => l.trim()).length;

  if (bulletCount > 1 && lineCount <= 2) {
    // Tek satırda birden fazla madde var → böl
    // "• X • Y • Z" → split by "•" (but keep •)
    // veya "* •X * •Y" → split by "* •"

    // "* •" ile bölmeyi dene
    if (formatted.includes("* •")) {
      const parts = formatted.split(/\s*\*\s*•/).filter((p) => p.trim());
      formatted =
        "\n" + parts.map((p) => `* •${p.trim()}`).join("\n") + "\n";
    } else {
      // Sadece "•" ile bölmeyi dene
      const parts = formatted.split(/\s*•\s*/).filter((p) => p.trim());
      formatted =
        "\n" + parts.map((p) => `* •${p.trim()}`).join("\n") + "\n";
    }
  } else if (bulletCount > 1 && lineCount > 1) {
    // Birden fazla satır var ama "•" prefix'i düzeltilmeli
    // Her satırdaki "•" yi "* •" ye çevir (eğer "* •" değilse)
    formatted = formatted.replace(/^(?!\* )•/gm, "* •");
  }

  return before + formatted + after;
}

/**
 * SIKÇA SORULAN SORULAR bölümünü formatla:
 * Tek satırdaki "Soru1? Cevap1. Soru2? Cevap2." → ayrı paragraflara böl
 */
function formatSSSSection(text: string): string {
  const sssHeader = "SIKÇA SORULAN SORULAR";
  const sssIdx = text.indexOf(sssHeader);
  if (sssIdx === -1) return text;

  const afterHeader = sssIdx + sssHeader.length;
  const before = text.slice(0, afterHeader);
  const sssContent = text.slice(afterHeader).trim();

  // SSS içeriğinde hiç \n yoksa → tek satırda yazılmış, böl
  const lines = sssContent.split("\n").filter((l) => l.trim());

  if (lines.length <= 1 && sssContent.length > 50) {
    // Tek satırda birden fazla soru-cevap var
    // Pattern: "Soru metni? Cevap metni. Soru metni? Cevap metni."
    // Soru ile bir önceki cevabın bitişini ayırmak için:
    // ". " + Büyük harf ile başlayan yeni cümle + "?" içeren pattern
    //
    // Strateji: "?" bul, sonraki cümle bitişini (". ") bul, orada böl
    const sssText = sssContent.replace(/^\n+/, "");

    // Her "? Cevap cümlesi." bloğunu bul
    // Soru: "?" ile biter. Cevap: bir veya daha fazla cümle, "." ile biter.
    // Sonraki soru: büyük harfle başlar
    // Pattern: split by ". " followed by a Turkish uppercase letter (new question start)
    const qaPairs = splitQAPairs(sssText);

    if (qaPairs.length > 1) {
      return before + "\n\n" + qaPairs.join("\n\n");
    }
  }

  return text;
}

/**
 * SSS metnini soru-cevap çiftlerine böl.
 * "Soru1? Cevap1. Soru2? Cevap2." → ["Soru1? Cevap1.", "Soru2? Cevap2."]
 */
function splitQAPairs(text: string): string[] {
  // Strateji: "." veya "." sonrası gelen ve içinde "?" olan yeni cümle başlangıçlarını bul
  // "Cevap bitti. Yeni soru başlıyor mu?" pattern'ı
  //
  // Regex: ". " + büyük harf ile başlayan kelime + ... + "?" → yeni soru başlangıcı
  // Split point: ". " 'den hemen önce + sonraki karakter büyük harf

  const pairs: string[] = [];
  let remaining = text.trim();

  // Soru işaretlerinin pozisyonlarını bul
  const questionMarks: number[] = [];
  for (let i = 0; i < remaining.length; i++) {
    if (remaining[i] === "?") questionMarks.push(i);
  }

  if (questionMarks.length <= 1) {
    // Tek soru veya soru yok
    return [remaining];
  }

  // Her soru işaretinden sonra cevabın bitişini bul
  // Cevap, sonraki sorunun başlangıcına kadar sürer
  // Sonraki sorunun başlangıcı: ". " + büyük harf (Türkçe dahil)
  for (let q = 0; q < questionMarks.length; q++) {
    const qPos = questionMarks[q];

    if (q === questionMarks.length - 1) {
      // Son soru-cevap çifti
      pairs.push(remaining.trim());
      break;
    }

    // Sonraki soru işareti
    const nextQPos = questionMarks[q + 1];

    // qPos ile nextQPos arasında ". " + büyük harf ara → bu split noktası
    let splitPoint = -1;
    for (let i = qPos + 1; i < nextQPos; i++) {
      if (
        remaining[i] === "." &&
        remaining[i + 1] === " " &&
        i + 2 < remaining.length &&
        /[A-ZÇĞIİÖŞÜ]/.test(remaining[i + 2])
      ) {
        // "." dan sonraki büyük harfli cümle, "?" içeriyor mu kontrol et
        const restUntilNextQ = remaining.slice(i + 2, nextQPos + 1);
        if (restUntilNextQ.includes("?")) {
          splitPoint = i + 1; // ". " den sonra böl
          break;
        }
      }
    }

    if (splitPoint > 0) {
      pairs.push(remaining.slice(0, splitPoint).trim());
      remaining = remaining.slice(splitPoint).trim();
      // questionMarks'ı offset'le → gerek yok, remaining değişti, yeniden ara
      // Kalan metni recursive olarak işle
      const restPairs = splitQAPairs(remaining);
      pairs.push(...restPairs);
      break;
    }
  }

  return pairs.length > 0 ? pairs : [text];
}

/**
 * Regex özel karakterlerini escape et
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
