import { Breadcrumb } from "@/components/ui/Breadcrumb";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gizlilik Politikası",
  description:
    "Vorte Tekstil gizlilik politikası. Kişisel verilerin korunması ve gizlilik ilkelerimiz.",
  alternates: { canonical: "/gizlilik-politikasi" },
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Breadcrumb
        items={[
          { label: "Ana Sayfa", href: "/" },
          { label: "Gizlilik Politikası" },
        ]}
      />
      <h1 className="mt-6 text-3xl font-bold text-gray-900">
        Gizlilik Politikası
      </h1>
      <p className="mt-2 text-xs text-gray-400">Son güncelleme: 03.03.2026</p>

      <div className="mt-6 space-y-6 text-sm leading-relaxed text-gray-600">
        <p>
          Vorte Tekstil Toptan (&quot;Vorte&quot;, &quot;biz&quot;,
          &quot;şirketimiz&quot;) olarak, vorte.com.tr web sitesini ziyaret eden
          ve hizmetlerimizden yararlanan kullanıcıların gizliliğine büyük önem
          vermekteyiz. İşbu gizlilik politikası, hangi bilgilerin toplandığını,
          bu bilgilerin nasıl kullanıldığını, kimlerle paylaşıldığını ve
          haklarınızın neler olduğunu açıklamaktadır.
        </p>

        {/* --- Toplanan Bilgi Türleri --- */}
        <section>
          <h2 className="text-lg font-bold text-gray-900">
            1. Toplanan Bilgi Türleri
          </h2>

          <h3 className="mt-3 font-semibold text-gray-800">
            1.1. Doğrudan Sağlanan Bilgiler
          </h3>
          <p className="mt-1">
            Web sitemize üye olduğunuzda, sipariş verdiğinizde veya bizimle
            iletişime geçtiğinizde aşağıdaki bilgiler toplanmaktadır:
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>
              <strong>Kimlik bilgileri:</strong> Ad, soyad, T.C. kimlik numarası
              (fatura için)
            </li>
            <li>
              <strong>İletişim bilgileri:</strong> E-posta adresi, cep telefonu
              numarası
            </li>
            <li>
              <strong>Adres bilgileri:</strong> Teslimat adresi, fatura adresi
              (il, ilçe, mahalle, posta kodu)
            </li>
            <li>
              <strong>Hesap bilgileri:</strong> Kullanıcı adı, şifre
              (şifrelenmiş olarak saklanır)
            </li>
            <li>
              <strong>Sipariş bilgileri:</strong> Satın alınan ürünler, sipariş
              tutarları, tercih edilen beden ve renk
            </li>
            <li>
              <strong>Ödeme bilgileri:</strong> Ödeme yöntemi tercihi (kredi
              kartı bilgileri tarafımızca saklanmaz)
            </li>
            <li>
              <strong>Bayi bilgileri:</strong> Bayi kodu, firma unvanı, vergi
              dairesi, vergi numarası (bayi kullanıcıları için)
            </li>
          </ul>

          <h3 className="mt-3 font-semibold text-gray-800">
            1.2. Otomatik Olarak Toplanan Bilgiler
          </h3>
          <p className="mt-1">
            Web sitemizi ziyaret ettiğinizde otomatik olarak aşağıdaki teknik
            bilgiler toplanabilmektedir:
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>IP adresi</li>
            <li>Tarayıcı türü ve sürümü</li>
            <li>İşletim sistemi bilgileri</li>
            <li>Ziyaret edilen sayfalar ve sayfalarda geçirilen süre</li>
            <li>Yönlendiren web sitesi (referrer URL)</li>
            <li>Cihaz türü (masaüstü, mobil, tablet)</li>
            <li>Ekran çözünürlüğü</li>
            <li>Erişim tarihi ve saati</li>
          </ul>

          <h3 className="mt-3 font-semibold text-gray-800">
            1.3. Çerezler Aracılığıyla Toplanan Bilgiler
          </h3>
          <p className="mt-1">
            Çerezler (cookies) ve benzer izleme teknolojileri aracılığıyla
            kullanım verileri toplanmaktadır. Detaylı bilgi için aşağıdaki
            &quot;Çerez Politikası&quot; bölümüne bakınız.
          </p>
        </section>

        {/* --- Bilgi Toplama Yöntemleri --- */}
        <section>
          <h2 className="text-lg font-bold text-gray-900">
            2. Bilgi Toplama Yöntemleri
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>Web formları:</strong> Üyelik kayıt formu, sipariş formu,
              iletişim formu, bayi başvuru formu
            </li>
            <li>
              <strong>Çerezler:</strong> Oturum çerezleri, tercih çerezleri,
              analitik çerezler
            </li>
            <li>
              <strong>Otomatik toplama:</strong> Sunucu log dosyaları, web
              analitik araçları
            </li>
            <li>
              <strong>E-posta iletişimi:</strong> Müşteri hizmetleri ile yapılan
              yazışmalar
            </li>
            <li>
              <strong>Telefon görüşmeleri:</strong> Müşteri destek hattına
              yapılan aramalar
            </li>
          </ul>
        </section>

        {/* --- Bilgilerin Kullanım Amaçları --- */}
        <section>
          <h2 className="text-lg font-bold text-gray-900">
            3. Bilgilerin Kullanım Amaçları
          </h2>
          <p className="mt-2">
            Toplanan bilgiler aşağıdaki amaçlarla kullanılmaktadır:
          </p>

          <h3 className="mt-3 font-semibold text-gray-800">
            3.1. Hizmet Sunumu
          </h3>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>Üyelik hesabınızın oluşturulması ve yönetilmesi</li>
            <li>Siparişlerinizin alınması, işlenmesi ve takibi</li>
            <li>Ürünlerin teslimat adresinize gönderilmesi</li>
            <li>Fatura ve e-fatura düzenlenmesi</li>
            <li>İade ve değişim işlemlerinin yürütülmesi</li>
            <li>
              Bayi hesaplarının yönetilmesi ve toptan satış işlemlerinin
              gerçekleştirilmesi
            </li>
          </ul>

          <h3 className="mt-3 font-semibold text-gray-800">3.2. İletişim</h3>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>Sipariş durumu, kargo takibi ve teslimat bildirimleri</li>
            <li>Müşteri hizmetleri taleplerinin cevaplanması</li>
            <li>Hesabınızla ilgili önemli duyurular</li>
            <li>
              Açık rızanız dahilinde kampanya ve promosyon bildirimleri
            </li>
          </ul>

          <h3 className="mt-3 font-semibold text-gray-800">
            3.3. İyileştirme ve Analiz
          </h3>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>
              Web sitesi performansının ve kullanıcı deneyiminin
              iyileştirilmesi
            </li>
            <li>Ürün ve hizmet geliştirme çalışmaları</li>
            <li>
              Alışveriş eğilimlerinin analiz edilmesi (anonimleştirilmiş
              verilerle)
            </li>
            <li>Teknik sorunların tespit edilmesi ve giderilmesi</li>
          </ul>

          <h3 className="mt-3 font-semibold text-gray-800">
            3.4. Güvenlik ve Yasal Uyum
          </h3>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>Dolandırıcılık ve yetkisiz erişimlerin önlenmesi</li>
            <li>Yasal yükümlülüklerin yerine getirilmesi</li>
            <li>Hukuki uyuşmazlıklarda delil olarak kullanım</li>
          </ul>
        </section>

        {/* --- Çerez Politikası --- */}
        <section>
          <h2 className="text-lg font-bold text-gray-900">
            4. Çerez Politikası
          </h2>
          <p className="mt-2">
            vorte.com.tr, hizmet kalitesini artırmak ve size daha iyi bir
            deneyim sunmak amacıyla çerez teknolojisi kullanmaktadır.
          </p>

          <h3 className="mt-3 font-semibold text-gray-800">
            4.1. Çerez Türleri
          </h3>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-3 py-2 text-left font-semibold text-gray-800">
                    Çerez Türü
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-800">
                    Amacı
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-800">
                    Süre
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-3 py-2 font-medium">Zorunlu Çerezler</td>
                  <td className="px-3 py-2">
                    Oturum yönetimi, sepet işlevi, güvenlik. Site işlevselliği
                    için zorunludur.
                  </td>
                  <td className="px-3 py-2">Oturum süresi</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium">
                    İşlevsellik Çerezleri
                  </td>
                  <td className="px-3 py-2">
                    Dil tercihi, bölge seçimi, kullanıcı tercihlerinin
                    hatırlanması.
                  </td>
                  <td className="px-3 py-2">1 yıl</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium">Analitik Çerezler</td>
                  <td className="px-3 py-2">
                    Ziyaretçi istatistikleri, sayfa görüntülenmeleri, trafik
                    kaynakları analizi.
                  </td>
                  <td className="px-3 py-2">13 ay</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium">
                    Performans Çerezleri
                  </td>
                  <td className="px-3 py-2">
                    Sayfa yüklenme süreleri, hata raporları, site performans
                    ölçümü.
                  </td>
                  <td className="px-3 py-2">Oturum süresi</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="mt-3 font-semibold text-gray-800">
            4.2. Çerez Yönetimi
          </h3>
          <p className="mt-1">
            Çerez tercihlerinizi tarayıcı ayarlarınız üzerinden
            yönetebilirsiniz. Aşağıdaki bağlantılarda popüler tarayıcılar için
            çerez ayarları hakkında bilgi bulabilirsiniz:
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>
              Google Chrome: Ayarlar &gt; Gizlilik ve Güvenlik &gt; Çerezler
            </li>
            <li>Mozilla Firefox: Ayarlar &gt; Gizlilik &amp; Güvenlik</li>
            <li>Safari: Tercihler &gt; Gizlilik</li>
            <li>Microsoft Edge: Ayarlar &gt; Çerezler ve Site İzinleri</li>
          </ul>
          <p className="mt-1">
            Zorunlu çerezlerin devre dışı bırakılması halinde web sitesinin
            temel işlevleri (oturum açma, sepete ürün ekleme vb.) düzgün
            çalışmayabilir.
          </p>
        </section>

        {/* --- Üçüncü Taraf Hizmetler --- */}
        <section>
          <h2 className="text-lg font-bold text-gray-900">
            5. Üçüncü Taraf Hizmetler
          </h2>
          <p className="mt-2">
            Web sitemizin işleyişi kapsamında aşağıdaki üçüncü taraf hizmet
            sağlayıcılarıyla çalışılmaktadır. Bu hizmet sağlayıcılar, yalnızca
            belirtilen amaçlar doğrultusunda ve gerekli ölçüde verilerinize
            erişebilmektedir:
          </p>

          <h3 className="mt-3 font-semibold text-gray-800">
            5.1. iyzico (Ödeme Altyapısı)
          </h3>
          <p className="mt-1">
            Kredi kartı ve banka kartı ile yapılan ödeme işlemleri, BDDK
            lisanslı ödeme kuruluşu iyzico üzerinden gerçekleştirilmektedir.
            Kredi kartı bilgileriniz doğrudan iyzico&apos;nun güvenli
            sunucularında işlenmekte olup, Vorte Tekstil sistemlerinde
            saklanmamaktadır. 3D Secure doğrulama ile ödemelerin güvenliği
            sağlanmaktadır.
          </p>

          <h3 className="mt-3 font-semibold text-gray-800">
            5.2. Geliver (Kargo ve Lojistik)
          </h3>
          <p className="mt-1">
            Sipariş teslimatınız için Geliver çoklu kargo entegrasyon altyapısı
            kullanılmaktadır. Teslimat için gerekli olan ad, soyad, telefon
            numarası ve adres bilgileriniz kargo firması ile
            paylaşılmaktadır. Geliver, birden fazla kargo firmasıyla çalışarak
            en uygun teslimat seçeneğini sunmaktadır.
          </p>

          <h3 className="mt-3 font-semibold text-gray-800">
            5.3. DIA CRM (E-Fatura / E-Arşiv)
          </h3>
          <p className="mt-1">
            Elektronik fatura ve e-arşiv fatura işlemleri DIA CRM altyapısı
            üzerinden gerçekleştirilmektedir. Fatura düzenlenmesi için gerekli
            kimlik ve adres bilgileriniz bu platform ile paylaşılmaktadır.
          </p>

          <h3 className="mt-3 font-semibold text-gray-800">
            5.4. Resend (E-posta Hizmeti)
          </h3>
          <p className="mt-1">
            Sipariş onayları, kargo bildirimleri ve diğer bilgilendirme
            e-postaları Resend e-posta altyapısı üzerinden gönderilmektedir. Bu
            amaçla e-posta adresiniz Resend ile paylaşılmaktadır.
          </p>

          <h3 className="mt-3 font-semibold text-gray-800">
            5.5. Google Analytics (Web Analitiği)
          </h3>
          <p className="mt-1">
            Web sitemizin kullanım istatistiklerini analiz etmek için Google
            Analytics kullanılmaktadır. Google Analytics, çerezler aracılığıyla
            anonimleştirilmiş kullanım verileri toplamaktadır. IP
            anonimizasyonu aktif olarak kullanılmaktadır. Google&apos;ın
            gizlilik politikası hakkında detaylı bilgi için Google Gizlilik
            Politikası sayfasını ziyaret edebilirsiniz.
          </p>
        </section>

        {/* --- Veri Güvenliği --- */}
        <section>
          <h2 className="text-lg font-bold text-gray-900">
            6. Veri Güvenliği Önlemleri
          </h2>
          <p className="mt-2">
            Kişisel verilerinizin güvenliğini sağlamak için aşağıdaki teknik ve
            idari tedbirler uygulanmaktadır:
          </p>

          <h3 className="mt-3 font-semibold text-gray-800">
            6.1. Teknik Önlemler
          </h3>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>
              <strong>SSL/TLS Şifreleme:</strong> Web sitemizdeki tüm veri
              iletişimi 256-bit SSL sertifikası ile şifrelenmektedir.
            </li>
            <li>
              <strong>Şifre Güvenliği:</strong> Kullanıcı şifreleri bcrypt
              algoritmasıyla hash&apos;lenerek saklanmaktadır; düz metin olarak
              kaydedilmez.
            </li>
            <li>
              <strong>3D Secure:</strong> Kredi kartı ödemeleri 3D Secure
              doğrulama ile korunmaktadır.
            </li>
            <li>
              <strong>Güvenlik Duvarı:</strong> Sunucu ve uygulama düzeyinde
              güvenlik duvarı korumaları uygulanmaktadır.
            </li>
            <li>
              <strong>Erişim Kontrolleri:</strong> Kişisel verilere erişim,
              yetki seviyeleri ile sınırlandırılmıştır.
            </li>
            <li>
              <strong>Düzenli Yedekleme:</strong> Veriler düzenli olarak
              yedeklenmekte ve güvenli ortamlarda saklanmaktadır.
            </li>
            <li>
              <strong>Güvenlik Güncellemeleri:</strong> Sistem ve yazılım
              güncellemeleri düzenli olarak yapılmaktadır.
            </li>
          </ul>

          <h3 className="mt-3 font-semibold text-gray-800">
            6.2. İdari Önlemler
          </h3>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>
              Çalışanlara kişisel verilerin korunması konusunda bilgilendirme
              yapılmaktadır.
            </li>
            <li>
              Veri işleme süreçlerinde &quot;gerekenin en azı&quot; (minimum
              veri) ilkesi uygulanmaktadır.
            </li>
            <li>
              Üçüncü taraf hizmet sağlayıcılarıyla gizlilik sözleşmeleri
              imzalanmaktadır.
            </li>
            <li>
              Veri ihlali durumunda acil müdahale planı bulunmaktadır.
            </li>
            <li>Periyodik güvenlik değerlendirmeleri yapılmaktadır.</li>
          </ul>
        </section>

        {/* --- Saklama Süreleri --- */}
        <section>
          <h2 className="text-lg font-bold text-gray-900">
            7. Veri Saklama Süreleri
          </h2>
          <p className="mt-2">
            Kişisel verileriniz, işleme amacının gerektirdiği süre boyunca ve
            yasal zorunluluklar çerçevesinde saklanmaktadır:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>Hesap bilgileri:</strong> Üyelik süresi boyunca ve hesap
              kapatılmasından itibaren 3 yıl
            </li>
            <li>
              <strong>Sipariş ve ticari kayıtlar:</strong> İşlemin
              gerçekleştiği yıldan itibaren 10 yıl (Türk Ticaret Kanunu)
            </li>
            <li>
              <strong>Fatura bilgileri:</strong> Düzenlendiği yıldan itibaren 10
              yıl (Vergi Usul Kanunu)
            </li>
            <li>
              <strong>E-ticaret kayıtları:</strong> İşlemin gerçekleştiği
              tarihten itibaren 3 yıl (6563 sayılı Kanun)
            </li>
            <li>
              <strong>İletişim kayıtları:</strong> İletişim tarihinden itibaren
              3 yıl
            </li>
            <li>
              <strong>Log kayıtları:</strong> 2 yıl (5651 sayılı Kanun)
            </li>
            <li>
              <strong>Çerez verileri:</strong> Çerez türüne göre oturum süresi
              ile 13 ay arasında
            </li>
            <li>
              <strong>Pazarlama onayları:</strong> Onay geri çekilene kadar + 1
              yıl
            </li>
          </ul>
          <p className="mt-2">
            Saklama süresi dolan veriler, ilgili mevzuat uyarınca periyodik
            olarak silinmekte, yok edilmekte veya anonim hale getirilmektedir.
          </p>
        </section>

        {/* --- Kullanıcı Hakları --- */}
        <section>
          <h2 className="text-lg font-bold text-gray-900">
            8. Kullanıcı Hakları
          </h2>
          <p className="mt-2">
            6698 sayılı KVKK kapsamında aşağıdaki haklara sahipsiniz:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
            <li>İşlenmişse buna ilişkin bilgi talep etme</li>
            <li>
              İşleme amacını ve amacına uygun kullanılıp kullanılmadığını
              öğrenme
            </li>
            <li>Verilerin aktarıldığı üçüncü kişileri bilme</li>
            <li>
              Eksik veya yanlış işlenmiş verilerin düzeltilmesini isteme
            </li>
            <li>
              KVKK&apos;nın 7. maddesi kapsamında verilerin silinmesini veya yok
              edilmesini isteme
            </li>
            <li>
              Düzeltme ve silme işlemlerinin üçüncü kişilere bildirilmesini
              isteme
            </li>
            <li>
              Otomatik analiz sonucu aleyhinize bir sonuç çıkması durumunda
              itiraz etme
            </li>
            <li>
              Kanuna aykırı işleme nedeniyle zararın giderilmesini talep etme
            </li>
          </ul>
          <p className="mt-2">
            Ek olarak, ticari elektronik ileti alma onayı verdiğiniz hallerde,
            dilediğiniz zaman e-postalardaki &quot;abonelikten çık&quot;
            bağlantısı veya info@vorte.com.tr adresine yazarak onayı geri
            çekebilirsiniz.
          </p>
        </section>

        {/* --- Çocukların Gizliliği --- */}
        <section>
          <h2 className="text-lg font-bold text-gray-900">
            9. Çocukların Gizliliği
          </h2>
          <p className="mt-2">
            vorte.com.tr, 18 yaşından küçük bireylere yönelik bir hizmet
            sunmamaktadır. Bilerek 18 yaşından küçük kişilerden kişisel veri
            toplamamaktayız. Eğer 18 yaşından küçük bir bireye ait kişisel
            verilerin toplandığının fark edilmesi halinde, ilgili veriler derhal
            silinecektir.
          </p>
        </section>

        {/* --- Politika Güncellemeleri --- */}
        <section>
          <h2 className="text-lg font-bold text-gray-900">
            10. Politika Güncellemeleri
          </h2>
          <p className="mt-2">
            İşbu gizlilik politikası, yasal düzenlemelerdeki değişiklikler,
            teknolojik gelişmeler veya hizmet kapsamındaki güncellemeler
            nedeniyle zaman zaman revize edilebilir.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              Güncellenmiş politika, vorte.com.tr/gizlilik-politikasi adresinde
              yayınlanacaktır.
            </li>
            <li>
              Önemli değişiklikler yapılması halinde web sitesi üzerinden bildirim
              yapılacaktır.
            </li>
            <li>
              Politikanın en son güncellendiği tarih, sayfanın üst kısmında
              belirtilmektedir.
            </li>
            <li>
              Web sitesini kullanmaya devam etmeniz, güncel gizlilik
              politikasını kabul ettiğiniz anlamına gelmektedir.
            </li>
          </ul>
        </section>

        {/* --- İletişim --- */}
        <section>
          <h2 className="text-lg font-bold text-gray-900">11. İletişim</h2>
          <p className="mt-2">
            Gizlilik politikamız veya kişisel verilerinizin işlenmesi hakkında
            sorularınız, görüşleriniz veya talepleriniz için aşağıdaki iletişim
            kanallarından bize ulaşabilirsiniz:
          </p>
          <div className="mt-3 space-y-1 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="font-semibold text-gray-900">Vorte Tekstil Toptan</p>
            <p>Dumlupınar Mah., Kayabaşı Sok., 17BG, Nilüfer/Bursa</p>
            <p>
              E-posta:{" "}
              <a
                href="mailto:info@vorte.com.tr"
                className="text-green-600 underline hover:text-green-700"
              >
                info@vorte.com.tr
              </a>
            </p>
            <p>
              Telefon:{" "}
              <a
                href="tel:+908503058635"
                className="text-green-600 underline hover:text-green-700"
              >
                0850 305 86 35
              </a>
            </p>
            <p>
              Web:{" "}
              <a
                href="https://vorte.com.tr"
                className="text-green-600 underline hover:text-green-700"
              >
                vorte.com.tr
              </a>
            </p>
          </div>
          <p className="mt-3">
            KVKK kapsamındaki başvurularınız için ayrıca{" "}
            <a
              href="/kvkk"
              className="text-green-600 underline hover:text-green-700"
            >
              KVKK Aydınlatma Metni
            </a>{" "}
            sayfamızı inceleyebilir ve belirtilen başvuru yöntemlerini
            kullanabilirsiniz.
          </p>
        </section>
      </div>
    </div>
  );
}
