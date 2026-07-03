# GoodTrack — Yayına Hazırlık (Production Readiness) Denetim Raporu

> **Tarih:** 2 Temmuz 2026
> **Kapsam:** Backend Güvenlik, Backend İş Mantığı, Frontend, Deployment & CI/CD, Test Kapsamı
> **Yöntem:** 4 paralel ajan ile derinlemesine kod taraması

---

## Genel Değerlendirme

| Kategori | Durum | Özet |
|----------|-------|------|
| 🔒 Backend Güvenlik | 🟡 Kısmen Hazır | JWT ve IDOR sağlam; security headers, rate limiting kapsamı ve refresh token saklama eksik |
| 🧠 Backend İş Mantığı | 🔴 Kritik Sorunlar | Kredi iadesi implemente edilmemiş, dokümantasyon tutarsızlıkları, transaction eksikliği |
| 🎨 Frontend | 🟡 Kısmen Hazır | Mimari sağlam; Error Boundary yok, SignalR stale token sorunu var |
| 🚀 Deployment | 🟡 Kısmen Hazır | Docker root sorunu, health check eksikliği |
| 🧪 Test Kapsamı | 🔴 Yetersiz | Servislerin ~%80'i test edilmemiş, CI testleri eksik |

---

## 🔴 Kritik Sorunlar — Yayın Öncesi Mutlaka Çözülmeli

### 1. Kredi İade Mekanizması Hiç Implemente Edilmemiş

**Dosyalar:** [ProductService.cs](file:///c:/Users/acer/Desktop/GoodTrack/GoodTrack.API/Services/ProductService.cs) · [ICreditsService.cs](file:///c:/Users/acer/Desktop/GoodTrack/GoodTrack.API/Abstractions/Services/ICreditsService.cs)

> [!CAUTION]
> `PROJECT_KNOWLEDGE.md` belgesinde açıkça belirtilmesine rağmen, iptal edilen siparişlerde kredi iadesi **hiçbir yerde** gerçekleşmiyor.

Üç farklı senaryo etkileniyor:
- **Direkt iptal** (`awaiting` → `cancelled`): `TransitionAction` lambda sadece durumu değiştiriyor, kredi iade çağrısı yok (Satır 40-54)
- **İptal talebi onayı** (`production` → `cancelled`): Üretici onaylıyor ama kredi iade edilmiyor (Satır 668-674)
- **Sipariş silme** (`awaiting` durumundaki): `DeleteProductAsync` kredi iade etmeden siliyor (Satır 403-434)

`ICreditsService` interface'inde `RefundCreditAsync` gibi bir metod bile **tanımlı değil**.

**Etki:** Satıcılar iptal ettikleri her siparişte kalıcı olarak kredi kaybediyor.

---

### 2. Kredi Miktarları ve Fiyatlar — Kod ↔ Dokümantasyon Uyumsuzluğu

**Dosya:** [CreditsService.cs](file:///c:/Users/acer/Desktop/GoodTrack/GoodTrack.API/Services/CreditsService.cs)

| Plan | Dokümandaki Kredi | Koddaki Kredi | Dokümandaki Fiyat | Koddaki Fiyat |
|------|:-:|:-:|:-:|:-:|
| Free | **10** | **5** | $0 | $0 |
| Pro | 100 | 100 | **$29** | **$49** |
| Enterprise | **999999** (Sınırsız) | **1000** | **$99** | **$199** |

> [!CAUTION]
> 6 değerin 4'ü uyumsuz. Kullanıcılar beklentileriyle uyuşmayan paketler satın alabilir.

---

### 3. Sipariş Oluşturmada DB Transaction Eksikliği

**Dosya:** [ProductService.cs](file:///c:/Users/acer/Desktop/GoodTrack/GoodTrack.API/Services/ProductService.cs) (Satır 286-290)

```
Krediyi düş (L286)  →  Görseli sakla (L288)  →  Siparişi kaydet (L290)
```

Bu 3 adım bir transaction içinde sarılmadığından, görsel saklama veya sipariş kaydı başarısız olursa kredi düşülmüş ama sipariş oluşturulmamış olur. **Geri alma mekanizması yok.**

---

### 4. Durum Akışı Diyagramı Kodla Uyuşmuyor

**Dosya:** [PROJECT_KNOWLEDGE.md](file:///c:/Users/acer/Desktop/GoodTrack/PROJECT_KNOWLEDGE.md) (Satır 174-195) vs [ProductService.cs](file:///c:/Users/acer/Desktop/GoodTrack/GoodTrack.API/Services/ProductService.cs)

- Dokümanda `completed → to_ship` var, kodda `completed → delivered` da mevcut
- Dokümanda `defective → corrected` var, kodda `defective → production` olarak tanımlı
- JWT Token süresi: Dokümanda **12 saat**, kodda **3 saat** ([AuthService.cs](file:///c:/Users/acer/Desktop/GoodTrack/GoodTrack.API/Services/AuthService.cs) L409)

---

### 5. Docker Container Root Olarak Çalışıyor

**Dosya:** [Dockerfile](file:///c:/Users/acer/Desktop/GoodTrack/Dockerfile)

Son runtime aşamasında kullanıcı değiştirme yok. Container **root** olarak çalışıyor.

---

### 6. Health Check Endpoint Yok

**Dosya:** [Program.cs](file:///c:/Users/acer/Desktop/GoodTrack/GoodTrack.API/Program.cs)

`/health` veya `/healthz` endpoint'i bulunmuyor. Render.com'un servis izlemesi ve container orkestrasyonu için kritik.

---

### 7. appsettings.json'da Gerçek Üretim Şifreleri

**Dosya:** [appsettings.json](file:///c:/Users/acer/Desktop/GoodTrack/GoodTrack.API/appsettings.json)

> [!CAUTION]
> `.gitignore` dosyada olmasına rağmen, dosya daha önce commit edilmişse gerçek Supabase veritabanı şifresi ve JWT key'i Git geçmişinde görünür durumda olabilir.

- Satır 16: Gerçek DB connection string (`Password=Karzamani.123`)
- Satır 19: JWT signing key

---

## 🟡 Orta Öncelikli Sorunlar

### Güvenlik

| # | Sorun | Dosya |
|---|-------|-------|
| 8 | **Security headers eksik** (CSP, HSTS, X-Frame-Options, X-Content-Type-Options) | [Program.cs](file:///c:/Users/acer/Desktop/GoodTrack/GoodTrack.API/Program.cs) |
| 9 | **CORS — production'da AllowAnyOrigin fallback'i** (JWT gibi production kontrolü yok) | [Program.cs](file:///c:/Users/acer/Desktop/GoodTrack/GoodTrack.API/Program.cs) L119-137 |
| 10 | **`general-api` rate limiter tanımlı ama hiçbir yere uygulanmamış** | [Program.cs](file:///c:/Users/acer/Desktop/GoodTrack/GoodTrack.API/Program.cs) L104-115 |
| 11 | **Rate limiter global, IP bazlı değil** — Bir saldırgan tüm kullanıcıları kilitleyebilir | [Program.cs](file:///c:/Users/acer/Desktop/GoodTrack/GoodTrack.API/Program.cs) L132-151 |
| 12 | **Refresh token plain text olarak saklanıyor** (hash'lenmeli) | [AuthService.cs](file:///c:/Users/acer/Desktop/GoodTrack/GoodTrack.API/Services/AuthService.cs) L206-210 |
| 13 | **`/auth/refresh` endpoint'inde rate limiting yok** | [AuthController.cs](file:///c:/Users/acer/Desktop/GoodTrack/GoodTrack.API/Controllers/AuthController.cs) L101-134 |
| 14 | **500 hatalarında `ex.Message` sızıntısı** — DB bağlantı bilgileri sızabilir | [ExceptionHandlingMiddleware.cs](file:///c:/Users/acer/Desktop/GoodTrack/GoodTrack.API/Middlewares/ExceptionHandlingMiddleware.cs) |
| 15 | **Şifre politikası zayıf** — Sadece 6-20 karakter, karmaşıklık kuralı yok | [AuthService.cs](file:///c:/Users/acer/Desktop/GoodTrack/GoodTrack.API/Services/AuthService.cs) L134-138 |
| 16 | **`UseForwardedHeaders()` eksik** — Reverse proxy arkasında gerçek IP alınamıyor | [Program.cs](file:///c:/Users/acer/Desktop/GoodTrack/GoodTrack.API/Program.cs) |

### İş Mantığı

| # | Sorun | Dosya |
|---|-------|-------|
| 17 | **Plan yükseltme mevcut krediyi sıfırlıyor** (eklemek yerine) | [CreditsService.cs](file:///c:/Users/acer/Desktop/GoodTrack/GoodTrack.API/Services/CreditsService.cs) L96 |
| 18 | **Aynı plana tekrar "yükseltme" yapılabiliyor** — Kredi sıfırlaması exploit'i | [CreditsService.cs](file:///c:/Users/acer/Desktop/GoodTrack/GoodTrack.API/Services/CreditsService.cs) L66-101 |
| 19 | **SignalR hataları iş akışını kırıyor** — try-catch ile sarılmamış | [ProductService.cs](file:///c:/Users/acer/Desktop/GoodTrack/GoodTrack.API/Services/ProductService.cs) |
| 20 | **SignalR stale token sorunu** — Reconnect'te eski token kullanılıyor | [SignalRContext.tsx](file:///c:/Users/acer/Desktop/GoodTrack/client-app-redesign/src/context/SignalRContext.tsx) L39 |

### Frontend

| # | Sorun | Dosya |
|---|-------|-------|
| 21 | **React Error Boundary yok** — Render hatası beyaz ekrana yol açıyor | [App.tsx](file:///c:/Users/acer/Desktop/GoodTrack/client-app-redesign/src/App.tsx) |
| 22 | **Üretim kodunda console.log/warn ifadeleri** | Birden fazla dosya (SignalR, Auth, api.ts, hooks) |
| 23 | **Veri yükleme hatalarında UI'da hata gösterimi yok** — Sessiz başarısızlık | [DataContext.tsx](file:///c:/Users/acer/Desktop/GoodTrack/client-app-redesign/src/context/DataContext.tsx) |

### CI/CD & Test

| # | Sorun | Dosya |
|---|-------|-------|
| 24 | **CI pipeline testleri çalıştırmıyor** (`dotnet test` yok) | [ci.yml](file:///c:/Users/acer/Desktop/GoodTrack/.github/workflows/ci.yml) |
| 25 | **CI pipeline frontend build kontrolü yapmıyor** | [ci.yml](file:///c:/Users/acer/Desktop/GoodTrack/.github/workflows/ci.yml) |
| 26 | **Servislerin ~%80'i test edilmemiş** (ayrıntı aşağıda) | [GoodTrack.API.Tests/](file:///c:/Users/acer/Desktop/GoodTrack/GoodTrack.API.Tests) |

---

## 🧪 Test Kapsamı Analizi

| Servis / Katman | Test Durumu | Yorum |
|---|:-:|---|
| `CreditsService` | ✅ İyi | 5 test, concurrency dahil |
| `ProductStatusTransition` | ✅ Kısmi | 4 test, sadece durum geçiş kuralları |
| `AuthService` (Connection kısmı) | ✅ Kısmi | 5 test |
| `AuthService` (Login/Register/JWT) | ❌ **Yok** | 30KB'lık servisin büyük kısmı test edilmemiş |
| `ProductService` (Create/Update/Delete) | ❌ **Yok** | 30KB'lık servisin büyük kısmı test edilmemiş |
| `CatalogService` | ❌ **Yok** | Tamamen test edilmemiş |
| `FieldService` | ❌ **Yok** | Tamamen test edilmemiş |
| Tüm Controller'lar | ❌ **Yok** | Integration test yok |
| `ExceptionHandlingMiddleware` | ❌ **Yok** | |
| Frontend | ❌ **Yok** | Test runner bile yapılandırılmamış |

> [!WARNING]
> Boş bir `UnitTest1.cs` scaffold dosyası mevcut — silinmeli.

---

## 🟢 İyi Yapılanlar

Bu alanlar doğru implemente edilmiş ve değişiklik gerektirmiyor:

| Alan | Detay |
|------|-------|
| ✅ JWT üretim ortamı kontrolü | Production'da env var yoksa exception fırlatılıyor |
| ✅ Tüm controller'larda `[Authorize]` | Rol bazlı yetkilendirme eksiksiz |
| ✅ PBKDF2 + Salt şifre hashleme | Kriptografik olarak güvenli |
| ✅ IDOR koruması | Her sipariş operasyonunda sahiplik doğrulaması |
| ✅ Refresh Token rotation | Her refresh'te yeni token üretiliyor, eski geçersiz |
| ✅ Refresh Token expiry kontrolü | 7 gün süresi dolmuşsa reddediliyor |
| ✅ JWT algoritma doğrulama | Algorithm confusion saldırılarına karşı korumalı |
| ✅ Logout token temizliği | Sunucu + istemci tarafında eksiksiz |
| ✅ React route koruması | `ProtectedRoute` + rol bazlı guard'lar |
| ✅ Anti-flicker TTL mekanizması | `useRef<Map>` ile performanslı, 15sn TTL |
| ✅ Token refresh queue | Eşzamanlı 401'lerde kuyruk mekanizması |
| ✅ Logout localStorage temizliği | Tüm 5 key düzgün siliniyor |
| ✅ Dockerfile multi-stage build | 3 aşamalı, optimize edilmiş |
| ✅ .gitignore kapsamı | Secrets dosyaları ignore'da |
| ✅ SPA fallback routing | `MapFallbackToFile` doğru yapılandırılmış |
| ✅ Serilog yapılandırılmış loglama | Console + dosya, Microsoft logları bastırılmış |
| ✅ Minimal dependency seti (frontend) | Sadece 5 production bağımlılığı |
| ✅ Temiz kod tabanı | TODO/FIXME/HACK yorumu yok |

---

## Önceliklendirilmiş Yol Haritası

### 🔴 Faz 1 — Engel (Bu olmadan yayın yapılamaz)

| # | Görev | Tahmin |
|---|-------|--------|
| 1 | `RefundCreditAsync` metodunu implemente et; iptal ve silme akışlarına ekle | 2-3 saat |
| 2 | Kredi miktarları ve fiyatları düzelt (Kod veya Dokümantasyon) | 30 dk |
| 3 | `CreateOrderAsync`'e DB transaction sarmalayıcısı ekle | 1-2 saat |
| 4 | `PROJECT_KNOWLEDGE.md` durum diyagramını kodla eşitle | 1 saat |
| 5 | Health check endpoint ekle (`/health`) | 30 dk |
| 6 | `appsettings.json`'daki gerçek şifreleri kaldır, Git geçmişini temizle | 1 saat |

### 🟡 Faz 2 — Güvenlik Sertleştirme (Yayından kısa süre sonra)

| # | Görev |
|---|-------|
| 7 | Docker container'ı non-root user ile çalıştır |
| 8 | Security headers middleware ekle |
| 9 | CORS'a production kontrolü ekle (JWT key gibi) |
| 10 | Rate limiter'ı IP bazlı partition'a çevir ve global uygula |
| 11 | `/auth/refresh`'e rate limiting ekle |
| 12 | 500 hataları için sabit mesaj dön |
| 13 | `UseForwardedHeaders()` middleware ekle |
| 14 | Şifre politikasına karmaşıklık kuralları ekle |
| 15 | Aynı plana tekrar yükseltme kontrolü ekle |

### 🟢 Faz 3 — Kalite ve Stabilite

| # | Görev |
|---|-------|
| 16 | React Error Boundary ekle |
| 17 | Console ifadelerini temizle veya `import.meta.env.DEV` ile guard'la |
| 18 | SignalR `accessTokenFactory`'i `localStorage` okuması yap |
| 19 | SignalR bildirimlerini try-catch ile sar |
| 20 | CI pipeline'a `dotnet test` ve frontend build adımı ekle |
| 21 | Eksik servislerin birim testlerini yaz |
| 22 | Kullanılmayan DTO'ları ve `UnitTest1.cs`'i sil |
