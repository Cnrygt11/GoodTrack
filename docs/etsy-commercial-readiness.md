# Etsy Commercial API Başvuru Hazırlık Planı

> Amaç: GoodTrack'i Etsy "personal access" → "commercial access" başvurusuna hazır hale getirmek.
> Kaynaklar: [API Terms of Use](https://www.etsy.com/legal/api/), [Rate Limits](https://developers.etsy.com/documentation/essentials/rate-limits/), [Webhooks](https://developers.etsy.com/documentation/essentials/webhooks/).

## Neden commercial gerekli?
Etsy kuralı: uygulaman **kendi mağazan dışında 4'ten fazla mağazaya** hizmet verecekse commercial access şart. GoodTrack çok-satıcılı bir platform olduğu için bu zorunlu.

## Başvuru için Etsy'nin aradığı temel kriterler
1. Uygulama **tam işlevsel, test edilmiş, hatasız** olmalı.
2. **API Terms of Use**'a uyum (özellikle Bölüm 1: veri/caching, Bölüm 6: Etsy'den ayırt edilebilirlik).
3. Uygulama ve ana sayfası, kendini **Etsy'den net biçimde ayırmalı** (Etsy resmi uygulamasıymış gibi görünmemeli).
4. **Caching politikası**: gereksiz tekrar çağrıları önleyecek önbellekleme.
5. **Rate limit** kurallarına uyum: 10 QPS / 10.000 QPD (sliding window). Daha fazlası için developer@etsy.com'a QPD/QPS tahminiyle başvuru.
6. Başvuru formunda: uygulama amacı, ekran görüntüleri/demo, tahmini çağrı hacmi.
7. **AI/LLM kısıtı**: Etsy verisini generative AI/LLM/ML ile besleyen kullanımlara izin vermiyor — GoodTrack'te böyle bir kullanım OLMAMALI (şu an yok, korunmalı).

---

## Durum değerlendirmesi (kod tabanı)

| Alan | Durum | Aksiyon |
|---|---|---|
| Webhook platform secret | ✅ Yapıldı (bu turda) | — |
| OAuth state kalıcılığı | ✅ Yapıldı | — |
| Webhook imza doğrulama (güvenli varsayılan + v1, formatı) | ✅ Yapıldı | — |
| Müşteri PII üreticiden gizli | ✅ Yapıldı | — |
| Inbound rate limiting (per-IP) | ✅ Var | — |
| **Outbound Etsy rate limiting/throttling** | ✅ Yapıldı (throttle + 429/5xx retry) | — |
| **Etsy yanıtlarının cache'lenmesi (redundant çağrı azaltma)** | ✅ Değerlendirildi + uygulandı (görsel dedup + PII cache'lenmez) | — |
| **Token'ların şifreli saklanması (at-rest)** | ✅ Yapıldı (IDataProtection + EF converter) | — |
| **Data Protection key ring kalıcılığı (DB)** | ✅ Yapıldı (PersistKeysToDbContext) | — |
| **Erişim iptalinde veri temizliği** | ✅ Yapıldı (disconnect + cascade + self-service soft-delete, testli) | — |
| **Privacy Policy / Terms sayfası** | ✅ Yapıldı (/privacy, /terms — taslak) | Gerçek bilgiler + hukuki inceleme |
| **Etsy attribution / marka ayrımı** | ✅ Yapıldı (Terms beyanı + UI notu; logo yok, sorunlu dil yok) | — |
| N+1 Etsy çağrıları (listing başına SKU+görsel) | ✅ Yapıldı (listings/batch ile toplu çekim) | — |

---

## Plan (öncelik sırasına göre)

### Aşama 1 — Terms of Use uyumu (başvuru için zorunlu)

**1.1 Outbound Etsy rate limiting. ✅ YAPILDI**
[EtsyRateLimitingHandler](../GoodTrack.API/Services/Etsy/EtsyRateLimitingHandler.cs) — `EtsyApiClient`'ın HttpClient pipeline'ına eklenen `DelegatingHandler`:
- Süreç genelinde paylaşılan token bucket ile **~8 QPS** throttle (Etsy 10 QPS limitinin altında; fazla istek reddedilmez, kuyruğa alınıp yavaşlatılır).
- **429 ve geçici 5xx** yanıtlarında `Retry-After` başlığına saygılı; yoksa jitter'lı exponential backoff (max 3 retry). POST gövdesi retry'larda korunur.
- Yeni paket gerektirmedi (`System.Threading.RateLimiting`).
- Kalan (Aşama 4): `FetchAndImportEtsyListingsAsync` içindeki listing başına SKU+görsel N+1 çağrıları hâlâ çok sayıda istek üretiyor — throttle sayesinde artık **güvenli** ama yavaş (100 ürün ≈ 300 çağrı). İleride toplu/azaltılmış çağrılarla optimize edilebilir.

**1.2 Etsy yanıt cache'i (redundant çağrı azaltma). ✅ DEĞERLENDİRİLDİ + UYGULANDI**
İnceleme sonucu: response-level `IMemoryCache` bu erişim modeline **uygun değil** —
- Token takas/yenileme: kısa ömürlü, expiry-yönetimli (cache anlamsız);
- Shop bilgisi: zaten DB'de kalıcı (`EtsyShopName`);
- Listing çekme: kullanıcı "Etsy Ürünlerini Çek" ile **manuel tetikliyor → güncel bekliyor** (cache bayat veri gösterirdi);
- Receipt / paid receipts: **buyer PII → Terms cache'lemeyi kısıtlar** (kodda belgelendi).

Terms'in "redundant çağrıyı azalt" beklentisi zaten karşılanıyor ve **test/yorumla kilitlendi**:
- Görsel deduplikasyonu: DB'de geçerli base64 görsel varsa CDN'den yeniden indirilmez ([EtsyService](../GoodTrack.API/Services/EtsyService.cs), 2 test).
- Token/shop DB'de saklanıp yeniden kullanılıyor; sipariş işleme idempotent (aynı transaction/receipt tekrar işlenmez).
- Receipt endpoint'lerine "PII — bilinçli olarak cache'lenmez" notu eklendi.

**1.3 Token'ların şifreli saklanması. ✅ YAPILDI**
`EtsyConnection` hassas kolonları (`AccessToken`, `RefreshToken`, `ApiKeySharedSecret`, `WebhookSigningSecret`) artık at-rest şifreli. `ApiKeyKeystring` public client_id olduğu için şifrelenmez.
- ASP.NET `IDataProtection` + EF `ValueConverter` ([EncryptedStringConverter.cs](../GoodTrack.API/Infrastructure/EncryptedStringConverter.cs)); [AppDbContext](../GoodTrack.API/Infrastructure/AppDbContext.cs) `ConfigureEtsyConnectionEncryption`.
- Kolon uzunlukları 2000'e çıkarıldı (`EncryptEtsyConnectionSecrets` migration, uygulandı).
- Kademeli geçiş: eski düz metin değerler fallback ile okunur, sonraki yazımda şifrelenir (data-migration gerekmez).

**1.4 Data Protection key ring kalıcılığı. ✅ YAPILDI**
Anahtar halkası artık veritabanında kalıcı (`data_protection_keys` tablosu):
- `Microsoft.AspNetCore.DataProtection.EntityFrameworkCore` + `PersistKeysToDbContext<AppDbContext>()` + `SetApplicationName("GoodTrack")` (multi-instance aynı halkayı paylaşır).
- `AppDbContext` `IDataProtectionKeyContext` implement eder; `AddDataProtectionKeys` migration uygulandı.
- Restart / çok-instance / container yeniden dağıtımında anahtarlar korunur → şifreli token'lar her koşulda çözülür.
- Circular dependency (context → provider → context) riski entegrasyon testiyle çürütüldü (host ayağa kalkar, key DB'ye yazılır, restart'ta çözülür).
- Transitive `System.Security.Cryptography.Xml` 9.0.4 (NU1903, high) → yamalı 10.0.9'a pinlendi.
- **İsteğe bağlı ileri koruma:** anahtarların kendisi DB'de korumasız (XML) durur; `ProtectKeysWithCertificate` ile şifrelenebilir (sertifika altyapısı gerektirir, şart değil — DB erişimi olan zaten şifreli veriye de erişebilir).

### Aşama 2 — Yasal/görünürlük gereksinimleri

**2.1 Privacy Policy + Terms of Service. ✅ YAPILDI**
Herkese açık iki sayfa (login gerektirmez): [PrivacyPolicyPage](../client-app-redesign/src/components/legal/PrivacyPolicyPage.tsx) (`/privacy`) ve [TermsOfServicePage](../client-app-redesign/src/components/legal/TermsOfServicePage.tsx) (`/terms`), ortak [LegalLayout](../client-app-redesign/src/components/legal/LegalLayout.tsx), tr/en, tema uyumlu, landing footer'dan link.
- Privacy: toplanan Etsy verisi (mağaza, listing, receipt, müşteri adı/adres, OAuth token), kullanım amacı, reklam/satış/LLM-eğitimi YOK, üreticiye müşteri PII gizli, saklama/silme (disconnect → token silinir), at-rest şifreleme.
- **KALAN:** İçerik TASLAK — gerçek iletişim e-postası (şu an `destek@goodtrack.example` placeholder), yasal tüzel kişi/adres ve hukuki inceleme gerekli. Sayfa üstünde her iki dilde uyarı kutusu mevcut.

**2.2 Etsy marka ayrımı (Bölüm 6). ✅ YAPILDI**
- Terms of Service'te açık beyan: *"GoodTrack bağımsız bir uygulamadır; Etsy, Inc. tarafından geliştirilmemiş, ona ait değil, desteklenmiyor/onaylanmıyor. Etsy®, Etsy, Inc.'in tescilli markasıdır."* + Etsy API Terms of Use'a link.
- Etsy entegrasyon panelinde ([EtsyIntegration.tsx](../client-app-redesign/src/components/profile/EtsyIntegration.tsx)) kullanıcıya görünür marka-ayrımı notu eklendi (tr/en `etsyTrademarkNote`).
- Denetim: UI'da **Etsy logo görseli kullanılmıyor** ve "resmi/official Etsy uygulaması" imalı dil **yok**; mevcut ibareler ("Etsy Entegrasyonu", "Etsy mağazanızdan eşitleyin") yalnızca entegrasyonu belirtiyor.

**2.3 Erişim iptalinde veri temizliği. ✅ YAPILDI**
- **Disconnect** ([EtsySyncController](../GoodTrack.API/Controllers/EtsySyncController.cs)) → `EtsyConnection` (şifreli OAuth token'lar dahil) DB'den silinir. [EtsyDisconnectTests](../GoodTrack.API.Tests/EtsyDisconnectTests.cs) ile kilitlendi: token silinir, satıcı izolasyonu korunur.
- Etsy'de app revoke edilince token geçersizleşir → `RefreshAccessTokenAsync` `IsActive=false` yapar.
- **Hesap silme:** Privacy Policy "silinmeyi **talep edebilirsiniz**" der; talep → admin siler (`AdminController.DeleteUser`) → User→EtsyConnection **cascade** ile Etsy verisi/token da silinir (testli). Bu, beyanı karşılar; self-service silme zorunlu değil.
- **Buyer PII** (customer_name/shipping_address): siparişte tutulur, yalnızca satıcıya görünür (üreticiden gizli — Aşama 1'de yapıldı), "gerekli olduğu sürece" saklanır (Privacy'de beyan).
- **Orphan temizliği ✅:** Admin bir kullanıcıyı fiziksel silince, FK cascade'i olmayan ilişkili kayıtlar (`Products`, `CatalogProducts`, `UserConnection` — satıcı veya üretici olarak) uygulama seviyesinde tek transaction'da temizlenir ([PostgresUserRepository.DeleteUserAsync](../GoodTrack.API/Infrastructure/Repositories/PostgresUserRepository.cs), [UserDeletionTests](../GoodTrack.API.Tests/UserDeletionTests.cs) ile kilitlendi). EtsyConnection/EtsyOAuthState/UserCredit zaten DB FK cascade ile gider.

### Aşama 3 — Webhook commercial aktivasyonu (kod hazır ✅)

Commercial app onaylandığında:
1. Etsy Developer Portal → app → **Go to Webhook portal**.
2. `order.paid`, `order.canceled` (istenirse `order.shipped`, `order.delivered`) aboneliklerini oluştur; callback URL = `https://<domain>/api/etsywebhook/webhook`.
3. Portalın verdiği **tek** `whsec_...` secret'ını config'e gir:
   `dotnet user-secrets set "Etsy:WebhookSigningSecret" "whsec_..."` (veya prod'da `ETSY_WEBHOOK_SIGNING_SECRET` env).
4. Bitti — tüm satıcıların webhook'ları otomatik doğrulanır. **Satıcılar hiçbir şey girmez.**

> Kod tarafı bu turda tamamlandı: platform secret önceliği, mağaza-secret fallback'i, secret yoksa reddetme. Profildeki manuel secret alanı artık opsiyonel (personal dönemde tek mağaza için kullanılabilir); commercial'da gizlenebilir/kaldırılabilir (Aşama 4).

### Aşama 4 — Cila (başvuru sonrası / opsiyonel)

- ✅ Profildeki manuel "webhook signing secret" alanı commercial modda UI'dan gizlenir: `GET /etsysync/webhook-config` platform secret durumunu döner; [EtsyActiveStoresList](../client-app-redesign/src/components/profile/parts/EtsyActiveStoresList.tsx) platform yapılandırıldığında URL+secret formu yerine bilgi notu gösterir.
- ✅ N+1 listing çağrıları azaltıldı (bkz. 1.1 / durum tablosu — `listings/batch`).
- Webhook teslimat hatalarında idempotency logları / retry gözlemi (opsiyonel).
- Başvuru için demo hesabı + ekran görüntüleri hazırla (kullanıcı işi).

---

## Başvuru öncesi kontrol listesi (özet)

**Kod tarafı (tamamlandı):**
- [x] Outbound Etsy rate limit + 429 backoff
- [x] Etsy redundant çağrı azaltma (görsel dedup; response-cache uygun değil) + N+1 giderme (listings/batch)
- [x] Token at-rest şifreleme + kalıcı key ring (DB)
- [x] Privacy Policy + Terms sayfaları (kodu var — içerik taslak)
- [x] Etsy marka ayrımı (Terms beyanı + UI notu)
- [x] Veri temizliği / soft-delete + saklama beyanı
- [x] AI/LLM ile Etsy verisi kullanılmadığının teyidi (kullanım yok)
- [x] Webhook güvenliği (imza, platform-secret, secret-yoksa-reddet)

**Kullanıcı tarafı (kod değil — başvurudan önce):**
- [ ] Yasal sayfalara gerçek iletişim/tüzel kişi bilgileri + **hukuki inceleme** (placeholder: `destek@goodtrack.example`)
- [ ] Gerçek bir Etsy mağazasıyla uçtan uca canlı test (şu an personal API + mağaza yok → yalnızca unit testlerle doğrulandı)
- [ ] Demo hesabı + ekran görüntüleri + QPD/QPS tahmini → developer@etsy.com
- [ ] Onay sonrası: webhook portalı aboneliği + tek `whsec_...` → `Etsy:WebhookSigningSecret`
