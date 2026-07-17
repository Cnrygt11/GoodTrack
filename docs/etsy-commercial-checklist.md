# Etsy Commercial API Başvurusu — Hazırlık Referansı

Bu belge, Etsy Open API v3 **commercial access** başvuru formunu doldururken ve
inceleme sürecinde referans olarak kullanılmak üzere hazırlanmıştır (2026-07-17).

## Uygulama kimliği

- **Uygulama adı:** GoodTrack ("Etsy" adı geçmez; marka çakışması yok, logo kullanılmaz)
- **Amaç (form açıklaması için):** Etsy satıcıları ile üretim yapan atölyeleri buluşturan
  sipariş/üretim takip platformu. Etsy entegrasyonu; satıcının kendi mağazasındaki aktif
  ürünleri (listing) GoodTrack kataloğuna aktarır ve ödenmiş siparişleri (receipt) üretim
  paneline taşır. Veriler yalnız ilgili satıcının hesabında görünür; üçüncü taraflara
  satılmaz/paylaşılmaz.

## Teknik uyum özeti (inceleme kriterleri)

| Kriter | Durum |
|---|---|
| OAuth 2.0 + PKCE | ✅ `EtsyOAuthService` — state tek kullanımlık, code_verifier sunucuda |
| İstenen scope'lar (minimum) | ✅ `transactions_r shops_r listings_r` (yalnız okuma) |
| Token saklama | ✅ Access/refresh token + secret'lar DB'de at-rest şifreli (ASP.NET Data Protection, kalıcı anahtar halkası) |
| Token'ların istemciye sızmaması | ✅ Hiçbir uçta dönmez; webhook secret dahi yalnız yazılabilir |
| Bağlantı kesilince veri silme | ✅ Disconnect, bağlantıyı ve tüm token'ları DB'den siler |
| Veri saklama sınırı | ✅ Arşivlenen siparişler 30 gün sonra otomatik "küçültülür": müşteri adı/adres (PII) ve görseller kalıcı silinir |
| Rate limit uyumu | ✅ Çıkışta `EtsyRateLimitingHandler` (10 QPS / 10.000-gün hedefli throttle + 429/5xx retry); kullanıcı başına manuel senkron cooldown'u (2/dk) |
| Birebir atıf kalıbı | ✅ "The term 'Etsy' is a trademark of Etsy, Inc. This application uses the Etsy API but is not endorsed or certified by Etsy, Inc." — landing footer, Kullanım Koşulları (TR+EN bölümleri) ve Etsy entegrasyon sayfasında |
| Gizlilik Politikası / Kullanım Koşulları | ✅ `/privacy` ve `/terms` (TR+EN), Etsy verisinin ne için kullanıldığı açık |
| Senkron modeli | **Polling** — kullanıcı tetiklemeli "Şimdi Eşitle" + OAuth sonrası içe aktarma. Etsy v3'te genel kullanıma açık webhook bulunmadığından arayüzde webhook yapılandırması sunulmaz. (Backend'de ileriye dönük bir webhook alıcısı vardır; Etsy webhook'u genel kullanıma açarsa `ETSY_WEBHOOK_SIGNING_SECRET` env ile etkinleşir.) |

## Etsy geliştirici panelinde yapılacaklar (kod dışı)

1. **Redirect URI kaydı** — uygulamanın callback adresi:
   `https://goodtrack.onrender.com/api/etsyauth/callback`
   (API host'u değişirse bu adres de güncellenmeli; FE `connect` isteğinde bu adresi gönderir.)
2. **Platform anahtarları (commercial mod):** `Etsy:ApiKeystring` + `Etsy:SharedSecret`
   yapılandırması / `ETSY_SHARED_SECRET` env — tüm satıcılar tek platform anahtarıyla bağlanır.
3. Başvuru formunda **çalışan demo**: personal erişimle gerçek bir mağazada uçtan uca akışı
   (bağlan → listing içe aktar → sipariş eşitle) gösterin; gerekiyorsa kısa ekran kaydı ekleyin.

## Bilinçli olarak askıda olanlar

- **Destek e-postası:** SMTP/hosting tamamlanana kadar bekliyor (kullanıcı kararı).
  Başvuru formuna gerçek bir iletişim adresi yazılması yeterli; uygulama içi geri bildirim
  formu mevcut.
- **Ödeme:** Plan/kredi satın alımı şu an sandbox (mock) — Etsy incelemesinin konusu değildir.
