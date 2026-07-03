# GoodTrack — Kod Kalitesi ve Profesyonellik Denetim Raporu

> **Tarih:** 3 Temmuz 2026
> **Kapsam:** Mimari temizlik, isimlendirme tutarlılığı, SRP ihlalleri, dead code, erişilebilirlik, TypeScript disiplini
> **Not:** Bu rapor güvenlik ve bug'lar dışında kalan **profesyonellik** sorunlarını kapsar.

---

## 🔴 Ciddi Profesyonellik Sorunları

### 1. Legacy Firestore/Firebase Referansları — Tamamlanmamış Göç

Proje PostgreSQL/EF Core kullanan bir uygulama olmasına rağmen, kodda **8 yerde** eski teknoloji (Firebase/Firestore) referansları kalmış:

| Dosya | Satır | İçerik |
|-------|:-----:|--------|
| [ProductService.cs](file:///c:/Users/acer/Desktop/GoodTrack/GoodTrack.API/Services/ProductService.cs) | 425 | `// Delete Firestore document` |
| [AuthService.cs](file:///c:/Users/acer/Desktop/GoodTrack/GoodTrack.API/Services/AuthService.cs) | 169 | `// Save user to Firestore` |
| [AuthService.cs](file:///c:/Users/acer/Desktop/GoodTrack/GoodTrack.API/Services/AuthService.cs) | 237 | `// Get connected user's info from Firestore` |
| [AuthService.cs](file:///c:/Users/acer/Desktop/GoodTrack/GoodTrack.API/Services/AuthService.cs) | 341, 535, 643, 736 | Çeşitli Firestore referansları |
| [RegisterRequest.cs](file:///c:/Users/acer/Desktop/GoodTrack/GoodTrack.API/DTOs/Auth/RegisterRequest.cs) | 5 | `/// matches Firestore Users collection structure.` |

> [!WARNING]
> Bu yorumlar yanıltıcıdır ve projenin Firebase'den PostgreSQL'e göç ettiğini ancak temizliğin yapılmadığını gösterir. Kurumsal bir projede bu kabul edilemez.

---

### 2. Login Controller'ı RefreshToken'ı Response'dan Düşürüyor (Bug)

**Dosya:** [AuthController.cs](file:///c:/Users/acer/Desktop/GoodTrack/GoodTrack.API/Controllers/AuthController.cs) (Satır 53)

`AuthService.LoginAsync()` metodu `LoginResponse` içinde `RefreshToken` üretiyor ve dönüyor, ancak **controller bu değeri response'a eklemiyor**:

```csharp
// Mevcut (HATALI):
return Ok(new { token = response.Token, username = response.Username, 
                role = response.Role, userId = response.UserId, message = "..." });
// ↑ refreshToken EKSİK!

// Refresh endpoint'i ise doğru (L112-120):
return Ok(new { token = ..., refreshToken = ..., ... });
```

> [!CAUTION]
> Bu, istemcinin ilk giriş sonrasında refresh token alamaması anlamına gelir. Frontend'in bunu nasıl çözdüğü araştırılmalıdır.

---

### 3. AuthService God Class (772 satır, 10+ sorumluluk)

**Dosya:** [AuthService.cs](file:///c:/Users/acer/Desktop/GoodTrack/GoodTrack.API/Services/AuthService.cs)

Tek bir servis sınıfı şu sorumlulukların hepsini taşıyor:

| Sorumluluk | Satır Aralığı |
|------------|:-------------:|
| Kullanıcı kaydı | 96-208 |
| Giriş & JWT üretimi | 53-94, 383-419 |
| Refresh token yönetimi | 421-516 |
| Bağlantı istekleri yönetimi | 219-408 |
| Profil güncelleme | 519-660 |
| Kullanıcı arama/keşif | 662-736 |
| Çıkış (Logout) | 758-772 |

**Bölünmesi gereken yapı:**
- `AuthService` → Giriş, kayıt, token yönetimi
- `ConnectionService` → Bağlantı istekleri, onay/ret
- `ProfileService` → Profil güncelleme, arama

---

### 4. ProductService God Class (731 satır)

**Dosya:** [ProductService.cs](file:///c:/Users/acer/Desktop/GoodTrack/GoodTrack.API/Services/ProductService.cs)

Sipariş CRUD + durum geçiş motoru + görsel yönetimi + SignalR bildirimleri + kredi entegrasyonu + iptal akışı hepsi tek sınıfta.

---

### 5. Tarihler `string` Olarak Saklanıyor

Çok sayıda model tarih/saat değerlerini `DateTime` yerine **ISO 8601 string** olarak saklıyor:

| Model | Property | Tip | Olması Gereken |
|-------|----------|:---:|:--------------:|
| `Product` | `CreatedAt` | `string` | `DateTime` |
| `Product` | `CompletedAt` | `string?` | `DateTime?` |
| `UserCredit` | `PlanStartedAt` | `string` | `DateTime` |
| `UserCredit` | `RenewsAt` | `string` | `DateTime` |
| `User` | `RefreshTokenExpiryTime` | `string` | `DateTime` |
| `UserConnection` | `ConnectedAt` | `string` | `DateTime` |

Bu yaklaşım zaman dilimi sorunlarına, parsing hatalarına ve DB seviyesinde tarih karşılaştırma/indeksleme yapılamamasına yol açar.

---

### 6. TypeScript `any` Kullanımı Yaygın

**Proje:** `client-app-redesign`

| Dosya | Kullanım |
|-------|----------|
| [api.ts](file:///c:/Users/acer/Desktop/GoodTrack/client-app-redesign/src/services/api.ts) | `resolve: (value?: any)`, `data: any` |
| [useMfrOrders.ts](file:///c:/Users/acer/Desktop/GoodTrack/client-app-redesign/src/hooks/useMfrOrders.ts) | `Record<string, any>` filtreler |
| [useSellerOrderForm.ts](file:///c:/Users/acer/Desktop/GoodTrack/client-app-redesign/src/hooks/useSellerOrderForm.ts) | `extras: Record<string, any>` |
| [DataContext.tsx](file:///c:/Users/acer/Desktop/GoodTrack/client-app-redesign/src/context/DataContext.tsx) | `Map<string, any>` optimistic updates |

TypeScript'in temel amacı olan tip güvenliğini zayıflatıyor.

---

## 🟡 Orta Öncelikli Profesyonellik Sorunları

### Backend

| # | Sorun | Detay |
|---|-------|-------|
| 7 | **Tutarsız API response şekilleri** | Bazı endpoint'ler `{message}`, bazıları `{product, message}`, bazıları direkt dizi dönüyor. Standart bir response envelope yok. |
| 8 | **Türkçe/İngilizce karışık hata mesajları** | Bazı hatalar sadece Türkçe, bazıları sadece İngilizce, bazıları iki dilli (`"Geçersiz token / Invalid token"`). Tutarlı bir dil stratejisi yok. |
| 9 | **Repository'lerde hardcoded string** | `PostgresUserRepository` ve `PostgresConnectionRequestRepository` dosyalarında `"mfr"`, `"pending"` gibi magic string'ler constant yerine direkt kullanılıyor. |
| 10 | **Controller içinde DTO tanımı** | `CreditsController.cs` L100-106'da `UpgradePlanRequest`, `FeedbackController.cs` L64-76'da `FeedbackInputDto` sınıfı controller dosyası içinde tanımlı. DTOs klasöründe olmalı. |
| 11 | **StatusTransitionRule sınıfı yanlış yerde** | `ProductService.cs` dosyasının en altında (L724-730) tanımlı. Kendi dosyasında olmalı. |
| 12 | **Tutarsız `sealed` kullanımı** | `AppDbContext`, `PostgresProductRepository`, `CreditsRepository` sealed iken; `AuthService`, `ProductService`, `PostgresUserRepository` gibi sınıflar sealed değil. |
| 13 | **Tutarsız repository isimlendirme** | 7 repository `Postgres` prefix'i kullanırken `CreditsRepository` prefix'siz. |
| 14 | **EF Core + Raw SQL migration karışımı** | `user_credits` tablosu raw SQL ile oluşturulmuş, EF migration geçmişinde izlenmiyor. |

