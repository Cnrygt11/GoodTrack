import { useSettings } from '../../context/SettingsContext';
import LegalLayout from './LegalLayout';

const CONTACT_EMAIL = 'cnrygtis@gmail.com';
const LAST_UPDATED = '2026-07-11';

export default function TermsOfServicePage() {
  const { language, t } = useSettings();
  const title = t('termsTitle');

  return (
    <LegalLayout title={title} lastUpdated={LAST_UPDATED}>
      {language === 'tr' ? <TurkishContent /> : <EnglishContent />}
    </LegalLayout>
  );
}

function TurkishContent() {
  return (
    <>
      <p>
        Bu Kullanım Koşulları, GoodTrack hizmetini kullanımınızı düzenler. Hizmeti kullanarak bu
        koşulları kabul etmiş olursunuz.
      </p>

      <h2>1. Hizmetin Tanımı</h2>
      <p>
        GoodTrack, satıcıların siparişlerini üreticilerle koordine etmesini ve üretim sürecini takip
        etmesini sağlayan bir platformdur. İsteğe bağlı olarak Etsy hesabınızı bağlayarak
        siparişlerinizi otomatik içe aktarabilirsiniz.
      </p>

      <h2>2. Etsy ile İlişkimiz</h2>
      <p>
        <strong>
          GoodTrack, Etsy, Inc. tarafından geliştirilmemiş, ona ait olmayan bağımsız bir uygulamadır
          ve Etsy tarafından desteklenmez veya onaylanmaz.
        </strong>{' '}
        "Etsy" adı yalnızca Etsy Open API ile sağlanan entegrasyonu belirtmek amacıyla kullanılır.
        Etsy®, Etsy, Inc.'in tescilli ticari markasıdır. GoodTrack'in Etsy ile tek bağlantısı, sizin
        açık izninizle (OAuth) Etsy Open API üzerinden kurduğunuz entegrasyondur.
      </p>
      <p>
        {/* Etsy API kullanım koşullarının istediği birebir (İngilizce) atıf kalıbı */}
        <em>
          The term 'Etsy' is a trademark of Etsy, Inc. This application uses the Etsy API but is not
          endorsed or certified by Etsy, Inc.
        </em>
      </p>

      <h2>3. Etsy API Kullanımı</h2>
      <p>
        Etsy entegrasyonu, Etsy Open API aracılığıyla ve
        <a href="https://www.etsy.com/legal/api/" target="_blank" rel="noopener noreferrer">
          {' '}
          Etsy API Kullanım Koşulları
        </a>
        'na uygun olarak çalışır. Etsy hesabınızı bağlayarak, Etsy verilerinize bu koşullar
        çerçevesinde erişmemize izin vermiş olursunuz. Bu izni istediğiniz zaman bağlantıyı
        kaldırarak geri çekebilirsiniz.
      </p>

      <h2>4. Kullanıcı Sorumlulukları</h2>
      <ul>
        <li>
          Hesap bilgilerinizin gizliliğinden ve hesabınız altındaki işlemlerden siz sorumlusunuz,
        </li>
        <li>Hizmeti yasalara uygun ve yalnızca yetkili olduğunuz veriler için kullanırsınız,</li>
        <li>
          Müşteri bilgilerini yalnızca ilgili siparişi yerine getirmek amacıyla kullanırsınız.
        </li>
      </ul>

      <h2>5. Fikri Mülkiyet</h2>
      <p>
        GoodTrack markası, arayüzü ve yazılımı bize aittir. Kataloğunuza yüklediğiniz içerikler ve
        Etsy'den içe aktarılan veriler üzerindeki haklar ilgili sahiplerine aittir.
      </p>

      <h2>6. Sorumluluğun Sınırlandırılması</h2>
      <p>
        Hizmet "olduğu gibi" sunulur. Yürürlükteki yasaların izin verdiği ölçüde, hizmetin
        kullanımından doğan dolaylı veya arızi zararlardan sorumlu değiliz. Etsy'nin API'sinde veya
        hizmetlerinde meydana gelebilecek kesinti ya da değişikliklerden sorumlu tutulamayız.
      </p>

      <h2>7. Fesih</h2>
      <p>
        Hesabınızı istediğiniz zaman kapatabilirsiniz. Bu koşulları ihlal etmeniz halinde
        erişiminizi askıya alabilir veya sonlandırabiliriz.
      </p>

      <h2>8. Değişiklikler</h2>
      <p>
        Bu koşulları güncelleyebiliriz. Önemli değişikliklerde bu sayfadaki "son güncelleme"
        tarihini yenileriz.
      </p>

      <h2>9. İletişim</h2>
      <p>
        Sorularınız için: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
    </>
  );
}

function EnglishContent() {
  return (
    <>
      <p>
        These Terms of Service govern your use of GoodTrack. By using the service, you agree to
        these terms.
      </p>

      <h2>1. The Service</h2>
      <p>
        GoodTrack is a platform that lets sellers coordinate orders with manufacturers and track
        production. Optionally, you can connect your Etsy account to import your orders
        automatically.
      </p>

      <h2>2. Our Relationship with Etsy</h2>
      <p>
        <strong>
          GoodTrack is an independent application; it is not developed, owned, endorsed, or
          certified by Etsy, Inc.
        </strong>{' '}
        The name "Etsy" is used solely to describe the integration provided through the Etsy Open
        API. Etsy® is a registered trademark of Etsy, Inc. GoodTrack's only connection to Etsy is
        the integration you establish, with your explicit consent (OAuth), through the Etsy Open
        API.
      </p>
      <p>
        {/* Verbatim attribution required by the Etsy API Terms of Use */}
        <em>
          The term 'Etsy' is a trademark of Etsy, Inc. This application uses the Etsy API but is not
          endorsed or certified by Etsy, Inc.
        </em>
      </p>

      <h2>3. Use of the Etsy API</h2>
      <p>
        The Etsy integration operates via the Etsy Open API and in accordance with the
        <a href="https://www.etsy.com/legal/api/" target="_blank" rel="noopener noreferrer">
          {' '}
          Etsy API Terms of Use
        </a>
        . By connecting your Etsy account, you authorize us to access your Etsy data within those
        terms. You may revoke this authorization at any time by disconnecting.
      </p>

      <h2>4. User Responsibilities</h2>
      <ul>
        <li>You are responsible for the confidentiality of your account and activity under it,</li>
        <li>You use the service lawfully and only for data you are authorized to access,</li>
        <li>You use customer information solely to fulfill the relevant order.</li>
      </ul>

      <h2>5. Intellectual Property</h2>
      <p>
        The GoodTrack brand, interface, and software are ours. Rights to content you upload to your
        catalog and data imported from Etsy remain with their respective owners.
      </p>

      <h2>6. Limitation of Liability</h2>
      <p>
        The service is provided "as is." To the extent permitted by law, we are not liable for
        indirect or incidental damages arising from your use of the service, nor for any
        interruption or change in Etsy's API or services.
      </p>

      <h2>7. Termination</h2>
      <p>
        You may close your account at any time. We may suspend or terminate your access if you
        violate these terms.
      </p>

      <h2>8. Changes</h2>
      <p>
        We may update these terms. For material changes we will refresh the "last updated" date on
        this page.
      </p>

      <h2>9. Contact</h2>
      <p>
        Questions: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
    </>
  );
}
