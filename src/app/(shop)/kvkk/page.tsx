import { Breadcrumb } from "@/components/ui/Breadcrumb";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "KVKK Aydınlatma Metni",
  description:
    "Vorte Tekstil KVKK aydınlatma metni. 6698 sayılı kanun kapsamında kişisel veri işleme politikamız.",
  alternates: { canonical: "/kvkk" },
};

export default function KVKKPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Breadcrumb
        items={[
          { label: "Ana Sayfa", href: "/" },
          { label: "KVKK Aydınlatma Metni" },
        ]}
      />
      <h1 className="mt-6 text-3xl font-bold text-gray-900">
        KVKK Aydınlatma Metni
      </h1>
      <p className="mt-2 text-xs text-gray-400">Son güncelleme: 03.03.2026</p>

      <div className="mt-6 space-y-6 text-sm leading-relaxed text-gray-600">
        <p>
          6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;)
          uyarınca, Vorte Tekstil Toptan (&quot;Şirket&quot;) olarak kişisel
          verilerinizin korunmasına büyük önem vermekteyiz. İşbu aydınlatma
          metni, kişisel verilerinizin hangi amaçlarla işlendiğini, kimlere ve
          hangi amaçla aktarılabileceğini, veri toplama yöntemi ve hukuki
          sebebini, KVKK&apos;nın 11. maddesinde sayılan haklarınızı
          açıklamaktadır.
        </p>

        {/* --- Veri Sorumlusu --- */}
        <section>
          <h2 className="text-lg font-bold text-gray-900">
            1. Veri Sorumlusunun Kimliği
          </h2>
          <div className="mt-2 space-y-1">
            <p>
              <strong>Unvan:</strong> Vorte Tekstil Toptan
            </p>
            <p>
              <strong>Adres:</strong> Dumlupınar Mah., Kayabaşı Sok., 17BG,
              Nilüfer/Bursa
            </p>
            <p>
              <strong>E-posta:</strong> info@vorte.com.tr
            </p>
            <p>
              <strong>Telefon:</strong> 0537 622 06 94
            </p>
            <p>
              <strong>Web Sitesi:</strong> vorte.com.tr
            </p>
          </div>
          <p className="mt-2">
            Vorte Tekstil Toptan, 6698 sayılı KVKK kapsamında &quot;veri
            sorumlusu&quot; sıfatıyla kişisel verilerinizi aşağıda açıklanan
            amaçlar ve kapsamda işlemektedir.
          </p>
        </section>

        {/* --- Kişisel Verilerin İşlenme Amaçları --- */}
        <section>
          <h2 className="text-lg font-bold text-gray-900">
            2. Kişisel Verilerin İşlenme Amaçları
          </h2>
          <p className="mt-2">
            Kişisel verileriniz aşağıdaki amaçlarla işlenmektedir:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              Üye kayıt işlemlerinin gerçekleştirilmesi ve üyelik sözleşmesinin
              ifası
            </li>
            <li>
              Sipariş alma, işleme, onaylama ve sipariş durumu hakkında
              bilgilendirme yapılması
            </li>
            <li>
              Ürün ve hizmetlerin teslimatının sağlanması (kargo/lojistik
              süreçlerinin yürütülmesi)
            </li>
            <li>
              Fatura düzenleme, e-fatura ve e-arşiv fatura işlemlerinin
              yürütülmesi
            </li>
            <li>
              Ödeme işlemlerinin gerçekleştirilmesi ve 3D Secure doğrulama
              süreçlerinin yürütülmesi
            </li>
            <li>
              Müşteri hizmetleri faaliyetlerinin yürütülmesi, şikâyet ve
              taleplerin yönetilmesi
            </li>
            <li>İade ve değişim süreçlerinin yönetilmesi</li>
            <li>
              Bayi (toptan satış) hesap işlemlerinin yürütülmesi ve bayi
              fiyatlandırmalarının uygulanması
            </li>
            <li>
              Kampanya, indirim ve promosyon faaliyetlerinin planlanması ve
              yürütülmesi
            </li>
            <li>
              Açık rızanızın bulunması halinde ticari elektronik ileti
              gönderilmesi (SMS, e-posta)
            </li>
            <li>
              Web sitesi kullanım analizleri ve kullanıcı deneyiminin
              iyileştirilmesi
            </li>
            <li>
              Yasal yükümlülüklerin yerine getirilmesi (vergi mevzuatı, tüketici
              mevzuatı, ticaret hukuku)
            </li>
            <li>
              Hukuki uyuşmazlıkların çözümlenmesi ve yasal hakların korunması
            </li>
            <li>
              Yetkili kamu kurum ve kuruluşlarına bilgi verilmesi
            </li>
          </ul>
        </section>

        {/* --- İşlenen Kişisel Veri Kategorileri --- */}
        <section>
          <h2 className="text-lg font-bold text-gray-900">
            3. İşlenen Kişisel Veri Kategorileri
          </h2>

          <h3 className="mt-3 font-semibold text-gray-800">
            3.1. Kimlik Bilgileri
          </h3>
          <p className="mt-1">
            Ad, soyad, T.C. kimlik numarası (fatura işlemleri için), doğum
            tarihi.
          </p>

          <h3 className="mt-3 font-semibold text-gray-800">
            3.2. İletişim Bilgileri
          </h3>
          <p className="mt-1">
            E-posta adresi, cep telefonu numarası, teslimat adresi, fatura
            adresi.
          </p>

          <h3 className="mt-3 font-semibold text-gray-800">
            3.3. Müşteri İşlem Bilgileri
          </h3>
          <p className="mt-1">
            Sipariş bilgileri, sipariş geçmişi, teslimat bilgileri, iade ve
            değişim kayıtları, müşteri hizmetleri talep ve şikâyet kayıtları,
            bayi kodu ve bayi işlem bilgileri.
          </p>

          <h3 className="mt-3 font-semibold text-gray-800">
            3.4. Finansal Bilgiler
          </h3>
          <p className="mt-1">
            Fatura bilgileri, ödeme geçmişi, banka hesap bilgileri (iade
            işlemleri için IBAN). Kredi kartı bilgileri tarafımızca
            saklanmamakta olup, ödeme altyapı sağlayıcısı iyzico üzerinden
            güvenli bir şekilde işlenmektedir.
          </p>

          <h3 className="mt-3 font-semibold text-gray-800">
            3.5. Pazarlama Bilgileri
          </h3>
          <p className="mt-1">
            Alışveriş tercihleri, ilgi alanları, kampanya katılım bilgileri,
            çerez verileri, açık rıza durumu.
          </p>

          <h3 className="mt-3 font-semibold text-gray-800">
            3.6. İşlem Güvenliği Bilgileri
          </h3>
          <p className="mt-1">
            IP adresi, tarayıcı türü ve sürümü, oturum bilgileri, işlem
            güvenliği verileri, log kayıtları.
          </p>
        </section>

        {/* --- Hukuki Sebepler --- */}
        <section>
          <h2 className="text-lg font-bold text-gray-900">
            4. Kişisel Verilerin İşlenmesinin Hukuki Sebepleri
          </h2>
          <p className="mt-2">
            Kişisel verileriniz, KVKK&apos;nın 5. maddesi kapsamında aşağıdaki
            hukuki sebeplere dayanılarak işlenmektedir:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>Sözleşmenin kurulması veya ifası:</strong> Satın alma
              sözleşmesi, üyelik sözleşmesi ve mesafeli satış sözleşmesinin
              gereğidir.
            </li>
            <li>
              <strong>Kanuni yükümlülük:</strong> 6563 sayılı Elektronik
              Ticaretin Düzenlenmesi Hakkında Kanun, 6502 sayılı Tüketicinin
              Korunması Hakkında Kanun, 213 sayılı Vergi Usul Kanunu ve ilgili
              mevzuat gereklilikleri.
            </li>
            <li>
              <strong>Meşru menfaat:</strong> Hizmet kalitesinin artırılması,
              dolandırıcılık önleme, sistem güvenliği.
            </li>
            <li>
              <strong>Açık rıza:</strong> Ticari elektronik ileti gönderimi,
              pazarlama ve profilleme faaliyetleri.
            </li>
          </ul>
        </section>

        {/* --- Verilerin Aktarılması --- */}
        <section>
          <h2 className="text-lg font-bold text-gray-900">
            5. Kişisel Verilerin Aktarıldığı Taraflar ve Aktarım Amaçları
          </h2>
          <p className="mt-2">
            Kişisel verileriniz, KVKK&apos;nın 8. ve 9. maddeleri kapsamında
            aşağıdaki taraflara aktarılabilmektedir:
          </p>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>
              <strong>Kargo ve Lojistik Firmaları (Geliver altyapısı):</strong>{" "}
              Sipariş teslimatının gerçekleştirilmesi amacıyla ad, soyad,
              telefon numarası ve teslimat adresi bilgileriniz paylaşılmaktadır.
            </li>
            <li>
              <strong>Ödeme Kuruluşları (iyzico):</strong> Ödeme işlemlerinin
              güvenli bir şekilde gerçekleştirilmesi amacıyla gerekli bilgiler
              iyzico ödeme altyapısına aktarılmaktadır. Kredi kartı bilgileri
              doğrudan iyzico tarafından işlenmekte olup, şirketimiz bünyesinde
              saklanmamaktadır.
            </li>
            <li>
              <strong>Mali Müşavir / Muhasebe:</strong> Yasal muhasebe ve vergi
              yükümlülüklerinin yerine getirilmesi amacıyla fatura ve finansal
              bilgiler paylaşılmaktadır.
            </li>
            <li>
              <strong>
                E-Fatura / E-Arşiv Hizmet Sağlayıcısı (DIA CRM):
              </strong>{" "}
              Elektronik fatura düzenlenmesi amacıyla fatura bilgileri
              aktarılmaktadır.
            </li>
            <li>
              <strong>E-posta Hizmet Sağlayıcısı (Resend):</strong> Sipariş
              bildirimleri ve bilgilendirme e-postalarının gönderilmesi amacıyla
              e-posta adresiniz kullanılmaktadır.
            </li>
            <li>
              <strong>Yetkili Kamu Kurum ve Kuruluşları:</strong> İlgili mevzuat
              hükmünün gerektirmesi halinde yasal yükümlülük kapsamında bilgi
              paylaşılmaktadır.
            </li>
            <li>
              <strong>Hukuk Danışmanları:</strong> Hukuki süreçlerin
              yürütülmesi ve hakların korunması amacıyla gerekli bilgiler
              paylaşılabilmektedir.
            </li>
          </ul>
        </section>

        {/* --- Veri Toplama Yöntemi --- */}
        <section>
          <h2 className="text-lg font-bold text-gray-900">
            6. Kişisel Verilerin Toplanma Yöntemi
          </h2>
          <p className="mt-2">
            Kişisel verileriniz aşağıdaki yöntemlerle toplanmaktadır:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              vorte.com.tr web sitesi üzerindeki üyelik ve sipariş formları
            </li>
            <li>Bayi giriş paneli ve bayi kayıt süreçleri</li>
            <li>
              Müşteri hizmetleri iletişim kanalları (e-posta, telefon)
            </li>
            <li>Çerezler ve otomatik veri toplama teknolojileri</li>
            <li>
              Sosyal medya kanalları üzerinden yapılan iletişimler
            </li>
          </ul>
        </section>

        {/* --- Saklama Süreleri --- */}
        <section>
          <h2 className="text-lg font-bold text-gray-900">
            7. Kişisel Verilerin Saklanma Süreleri
          </h2>
          <p className="mt-2">
            Kişisel verileriniz, işleme amacının gerektirdiği süre boyunca ve
            ilgili mevzuatta öngörülen zamanaşımları ile uyumlu olarak
            saklanmaktadır:
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-3 py-2 text-left font-semibold text-gray-800">
                    Veri Kategorisi
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-800">
                    Saklama Süresi
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-800">
                    Hukuki Dayanak
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-3 py-2">Üyelik bilgileri</td>
                  <td className="px-3 py-2">Üyelik süresince + 3 yıl</td>
                  <td className="px-3 py-2">Borçlar Kanunu zamanaşımları</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">Sipariş ve işlem bilgileri</td>
                  <td className="px-3 py-2">10 yıl</td>
                  <td className="px-3 py-2">Türk Ticaret Kanunu md. 82</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">Fatura ve finansal kayıtlar</td>
                  <td className="px-3 py-2">10 yıl</td>
                  <td className="px-3 py-2">Vergi Usul Kanunu md. 253</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">Elektronik ticaret kayıtları</td>
                  <td className="px-3 py-2">3 yıl</td>
                  <td className="px-3 py-2">
                    6563 sayılı Kanun ve yönetmelikleri
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2">
                    Ticari elektronik ileti onayları
                  </td>
                  <td className="px-3 py-2">
                    Onay geri çekilene kadar + 1 yıl
                  </td>
                  <td className="px-3 py-2">Ticari İletişim Yönetmeliği</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">Log ve erişim kayıtları</td>
                  <td className="px-3 py-2">2 yıl</td>
                  <td className="px-3 py-2">5651 sayılı Kanun</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">Çerez verileri</td>
                  <td className="px-3 py-2">En fazla 13 ay</td>
                  <td className="px-3 py-2">KVKK Kurul kararları</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2">
            Saklama süresi sona eren kişisel veriler, periyodik imha süreçleri
            kapsamında silinmekte, yok edilmekte veya anonim hale
            getirilmektedir.
          </p>
        </section>

        {/* --- İlgili Kişi Hakları --- */}
        <section>
          <h2 className="text-lg font-bold text-gray-900">
            8. İlgili Kişi Olarak Haklarınız (KVKK Madde 11)
          </h2>
          <p className="mt-2">
            KVKK&apos;nın 11. maddesi uyarınca, kişisel veri sahibi olarak
            aşağıdaki haklara sahipsiniz:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
            <li>
              Kişisel verileriniz işlenmişse buna ilişkin bilgi talep etme
            </li>
            <li>
              Kişisel verilerinizin işlenme amacını ve bunların amacına uygun
              kullanılıp kullanılmadığını öğrenme
            </li>
            <li>
              Yurt içinde veya yurt dışında kişisel verilerinizin aktarıldığı
              üçüncü kişileri bilme
            </li>
            <li>
              Kişisel verilerinizin eksik veya yanlış işlenmiş olması halinde
              bunların düzeltilmesini isteme
            </li>
            <li>
              KVKK&apos;nın 7. maddesinde öngörülen koşullar çerçevesinde
              kişisel verilerinizin silinmesini veya yok edilmesini isteme
            </li>
            <li>
              Düzeltme, silme ve yok etme işlemlerinin kişisel verilerinizin
              aktarıldığı üçüncü kişilere bildirilmesini isteme
            </li>
            <li>
              İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz
              edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz
              etme
            </li>
            <li>
              Kişisel verilerinizin kanuna aykırı olarak işlenmesi sebebiyle
              zarara uğramanız halinde zararın giderilmesini talep etme
            </li>
          </ul>
        </section>

        {/* --- Başvuru Yöntemleri --- */}
        <section>
          <h2 className="text-lg font-bold text-gray-900">
            9. Haklarınızı Kullanmak İçin Başvuru Yöntemleri
          </h2>
          <p className="mt-2">
            Yukarıda belirtilen haklarınızı kullanmak için aşağıdaki
            yöntemlerden birini tercih edebilirsiniz:
          </p>

          <h3 className="mt-3 font-semibold text-gray-800">
            9.1. E-posta ile Başvuru
          </h3>
          <p className="mt-1">
            <strong>info@vorte.com.tr</strong> adresine, konu kısmına
            &quot;KVKK Bilgi Talebi&quot; yazarak başvurunuzu
            iletebilirsiniz. Başvurunuzda kimliğinizi tespit edici bilgiler ile
            talebinizin açık ve anlaşılır bir şekilde yer alması gerekmektedir.
          </p>

          <h3 className="mt-3 font-semibold text-gray-800">
            9.2. Yazılı Başvuru
          </h3>
          <p className="mt-1">
            <strong>
              Dumlupınar Mah., Kayabaşı Sok., 17BG, Nilüfer/Bursa
            </strong>{" "}
            adresine noter aracılığıyla veya iadeli taahhütlü posta ile
            başvurabilirsiniz.
          </p>

          <h3 className="mt-3 font-semibold text-gray-800">
            9.3. Başvuru İçeriği
          </h3>
          <p className="mt-1">
            Başvurunuzda aşağıdaki bilgilerin yer alması zorunludur:
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>Ad, soyad ve başvuru yazılı ise imza</li>
            <li>
              T.C. kimlik numarası (yabancı uyrukluıar için pasaport numarası)
            </li>
            <li>Tebligata esas yerleşim yeri veya iş yeri adresi</li>
            <li>Bildirime esas e-posta adresi, telefon numarası</li>
            <li>Talep konusu</li>
          </ul>

          <h3 className="mt-3 font-semibold text-gray-800">
            9.4. Başvuru Değerlendirme Süresi
          </h3>
          <p className="mt-1">
            Başvurular, talebin niteliğine göre en kısa sürede ve en geç{" "}
            <strong>30 (otuz) gün</strong> içinde ücretsiz olarak
            sonuçlandırılacaktır. İşlemin ayrıca bir maliyet gerektirmesi
            halinde, Kişisel Verileri Koruma Kurulu tarafından belirlenen tarife
            üzerinden ücret talep edilebilir.
          </p>
        </section>

        {/* --- Çerez Politikası --- */}
        <section>
          <h2 className="text-lg font-bold text-gray-900">
            10. Çerez Politikası
          </h2>
          <p className="mt-2">
            vorte.com.tr web sitesi, hizmet kalitesini artırmak ve kullanıcı
            deneyimini iyileştirmek amacıyla çerez (cookie) teknolojisi
            kullanmaktadır.
          </p>

          <h3 className="mt-3 font-semibold text-gray-800">
            10.1. Kullanılan Çerez Türleri
          </h3>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>
              <strong>Zorunlu Çerezler:</strong> Web sitesinin temel
              işlevlerinin çalışması için gerekli çerezlerdir. Oturum yönetimi,
              sepet işlemleri ve güvenlik amacıyla kullanılır.
            </li>
            <li>
              <strong>Performans Çerezleri:</strong> Ziyaretçilerin siteyi nasıl
              kullandığına dair anonim bilgi toplar. Sayfa yüklenme süreleri ve
              hata raporları için kullanılır.
            </li>
            <li>
              <strong>İşlevsellik Çerezleri:</strong> Dil tercihi, bölge seçimi
              gibi kullanıcı tercihlerinin hatırlanmasını sağlar.
            </li>
            <li>
              <strong>Analitik Çerezler:</strong> Google Analytics gibi araçlar
              aracılığıyla site kullanım istatistiklerinin toplanması için
              kullanılır.
            </li>
          </ul>

          <h3 className="mt-3 font-semibold text-gray-800">
            10.2. Çerezlerin Yönetimi
          </h3>
          <p className="mt-1">
            Tarayıcı ayarlarınızı değiştirerek çerezleri reddedebilir veya
            silebilirsiniz. Ancak zorunlu çerezlerin devre dışı bırakılması, web
            sitesinin bazı işlevlerinin düzgün çalışmaması sonucunu
            doğurabilir.
          </p>
        </section>

        {/* --- Değişiklikler --- */}
        <section>
          <h2 className="text-lg font-bold text-gray-900">
            11. Aydınlatma Metninde Değişiklik
          </h2>
          <p className="mt-2">
            İşbu aydınlatma metni, yasal düzenlemelerdeki değişiklikler ve
            şirket politikalarındaki güncellemeler doğrultusunda
            değiştirilebilir. Güncel metin, her zaman vorte.com.tr/kvkk
            adresinde yayınlanacaktır. Önemli değişiklikler yapılması halinde,
            web sitemiz üzerinden veya e-posta yoluyla bilgilendirileceksiniz.
          </p>
        </section>

        {/* --- İletişim --- */}
        <section>
          <h2 className="text-lg font-bold text-gray-900">12. İletişim</h2>
          <p className="mt-2">
            KVKK kapsamındaki tüm soru, görüş ve başvurularınız için aşağıdaki
            iletişim kanallarını kullanabilirsiniz:
          </p>
          <div className="mt-2 space-y-1">
            <p>
              <strong>Vorte Tekstil Toptan</strong>
            </p>
            <p>Dumlupınar Mah., Kayabaşı Sok., 17BG, Nilüfer/Bursa</p>
            <p>E-posta: info@vorte.com.tr</p>
            <p>Telefon: 0537 622 06 94</p>
          </div>
        </section>
      </div>
    </div>
  );
}
