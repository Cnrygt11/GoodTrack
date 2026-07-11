import { useSettings } from '../../context/SettingsContext';
import LegalLayout from './LegalLayout';

// Yayına almadan önce güncellenmeli: gerçek iletişim adresi / yasal tüzel kişi.
const CONTACT_EMAIL = 'destek@goodtrack.example';
const LAST_UPDATED = '2026-07-11';

export default function PrivacyPolicyPage() {
  const { language, t } = useSettings();
  const title = t('privacyTitle');

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
        GoodTrack ("biz", "hizmet"), satıcılar ile üreticiler arasındaki sipariş takibini
        kolaylaştıran bir platformdur. Bu Gizlilik Politikası, hangi verileri topladığımızı, nasıl
        kullandığımızı, ne kadar sakladığımızı ve haklarınızı açıklar. Özellikle Etsy hesabınızı
        bağladığınızda işlenen verileri kapsar.
      </p>

      <h2>1. Topladığımız Veriler</h2>
      <p>
        <strong>Hesap bilgileri:</strong> kullanıcı adı, e-posta, rol (satıcı/üretici) ve profil
        bilgileri.
      </p>
      <p>
        <strong>Etsy entegrasyon verileri</strong> (yalnızca Etsy hesabınızı bağlarsanız):
      </p>
      <ul>
        <li>Etsy mağaza kimliği ve adı,</li>
        <li>Aktif ürün (listing) bilgileri: başlık, SKU, görsel,</li>
        <li>
          Sipariş (receipt) bilgileri: sipariş/işlem numarası, ürün, adet, varyasyonlar,
          kişiselleştirme notu,
        </li>
        <li>Sipariş kargolaması için gerekli olduğu ölçüde müşteri adı ve teslimat adresi,</li>
        <li>OAuth erişim/yenileme token'ları (mağazanıza erişim için).</li>
      </ul>

      <h2>2. Verileri Nasıl Kullanıyoruz</h2>
      <ul>
        <li>
          Etsy siparişlerinizi otomatik olarak panele aktarmak ve üretim sürecini takip etmek,
        </li>
        <li>Sipariş iptallerini Etsy ile senkronize etmek,</li>
        <li>Ürün kataloğunuzu oluşturmak ve üretici atamalarını yönetmek.</li>
      </ul>
      <p>
        Etsy verilerinizi <strong>reklam amacıyla kullanmaz</strong>, üçüncü taraflara satmaz ve
        yapay zeka / dil modeli (LLM) eğitimi için kullanmayız.
      </p>

      <h2>3. Veri Paylaşımı</h2>
      <p>
        Bir siparişi bir üreticiye gönderdiğinizde, üretim için gerekli bilgiler (ürün, adet,
        varyasyonlar, kişiselleştirme, görsel) ilgili üreticiyle paylaşılır.
        <strong> Müşteri adı ve teslimat adresi üreticilere gösterilmez</strong>; bu bilgiler
        yalnızca satıcı olarak size görünür.
      </p>

      <h2>4. Veri Saklama ve Silme</h2>
      <p>
        Verilerinizi yalnızca hizmeti sağlamak için gerekli olduğu sürece saklarız. Etsy mağaza
        bağlantınızı kaldırdığınızda, ilgili bağlantı ve saklanan token'lar sistemden silinir.
        Hesabınızın tümüyle silinmesini talep edebilirsiniz; bu durumda kişisel verileriniz makul
        bir süre içinde silinir (yasal saklama yükümlülükleri saklıdır).
      </p>

      <h2>5. Güvenlik</h2>
      <p>
        Etsy OAuth token'ları ve hassas secret'lar veritabanında <strong>şifreli (at-rest)</strong>
        olarak saklanır. Erişim yetkilendirme ile korunur ve aktarım sırasında şifreleme (HTTPS)
        kullanılır. Hiçbir sistem %100 güvenli olmasa da verilerinizi korumak için makul teknik ve
        idari önlemleri uygularız.
      </p>

      <h2>6. Haklarınız</h2>
      <p>
        Verilerinize erişme, düzeltme veya silinmesini talep etme hakkına sahipsiniz. Talepleriniz
        için aşağıdaki iletişim adresinden bize ulaşabilirsiniz.
      </p>

      <h2>7. Değişiklikler</h2>
      <p>
        Bu politikayı zaman zaman güncelleyebiliriz. Önemli değişikliklerde bu sayfadaki "son
        güncelleme" tarihini yenileriz.
      </p>

      <h2>8. İletişim</h2>
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
        GoodTrack ("we", "the service") is a platform that streamlines order tracking between
        sellers and manufacturers. This Privacy Policy explains what data we collect, how we use it,
        how long we keep it, and your rights — in particular the data processed when you connect
        your Etsy account.
      </p>

      <h2>1. Data We Collect</h2>
      <p>
        <strong>Account information:</strong> username, email, role (seller/manufacturer) and
        profile details.
      </p>
      <p>
        <strong>Etsy integration data</strong> (only if you connect your Etsy account):
      </p>
      <ul>
        <li>Etsy shop id and name,</li>
        <li>Active listing details: title, SKU, image,</li>
        <li>
          Receipt (order) details: receipt/transaction id, product, quantity, variations,
          personalization note,
        </li>
        <li>Customer name and shipping address, to the extent needed to fulfill the order,</li>
        <li>OAuth access/refresh tokens (to access your shop).</li>
      </ul>

      <h2>2. How We Use the Data</h2>
      <ul>
        <li>Automatically import your Etsy orders into the dashboard and track production,</li>
        <li>Synchronize order cancellations with Etsy,</li>
        <li>Build your product catalog and manage manufacturer assignments.</li>
      </ul>
      <p>
        We do <strong>not</strong> use your Etsy data for advertising, do not sell it to third
        parties, and do not use it to train AI / large language models.
      </p>

      <h2>3. Data Sharing</h2>
      <p>
        When you send an order to a manufacturer, the information needed for production (product,
        quantity, variations, personalization, image) is shared with that manufacturer.
        <strong> Customer name and shipping address are not shown to manufacturers</strong>; these
        are visible only to you as the seller.
      </p>

      <h2>4. Retention and Deletion</h2>
      <p>
        We retain your data only as long as needed to provide the service. When you disconnect your
        Etsy shop, the connection and stored tokens are deleted. You may request full deletion of
        your account, after which your personal data is deleted within a reasonable time (subject to
        legal retention obligations).
      </p>

      <h2>5. Security</h2>
      <p>
        Etsy OAuth tokens and sensitive secrets are stored <strong>encrypted at rest</strong> in the
        database, protected by access authorization, and transmitted over HTTPS. No system is 100%
        secure, but we apply reasonable technical and organizational measures to protect your data.
      </p>

      <h2>6. Your Rights</h2>
      <p>
        You have the right to access, correct, or request deletion of your data. Contact us using
        the address below.
      </p>

      <h2>7. Changes</h2>
      <p>
        We may update this policy from time to time. For material changes we will refresh the "last
        updated" date on this page.
      </p>

      <h2>8. Contact</h2>
      <p>
        Questions: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
    </>
  );
}
