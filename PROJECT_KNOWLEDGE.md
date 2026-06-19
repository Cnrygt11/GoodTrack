# GoodTrack — Proje Bilgi Belgesi (PROJECT_KNOWLEDGE)

> **Son Güncelleme:** 18 Haziran 2026  
> **Amaç:** Bu belge bir yapay zeka ajanının GoodTrack projesini kaynak kodunu tek tek analiz etmek zorunda kalmadan tam olarak anlaması için hazırlanmıştır. Bu belgeyi okuduktan sonra proje mimarisini, tüm dosya sorumluluklarını, API endpoint'lerini, veri modellerini ve bilinen teknik borçları tam olarak bilmeniz gerekir.

---

## 1. Proje Özeti

**GoodTrack**, satıcılar (seller) ile üreticiler (manufacturer / mfr) arasındaki B2B üretim sipariş süreçlerini takip eden bir web uygulamasıdır. Satıcılar sipariş oluşturur, üreticiler siparişleri işler ve her iki taraf anlık durum güncellemelerini görür. Proje gerçek zamanlı bildirimler için **SignalR** kullanır.

### Kullanıcı Rolleri
| Rol | Türkçe | Özet |
|-----|--------|------|
| `seller` | Satıcı | Sipariş oluşturur, katalog yönetir, üretici arar ve bağlantı ekler |
| `mfr` | Üretici (Manufacturer) | Siparişleri üretir, defect/missing bildirir, sipariş durumunu günceller |
| `admin` | Admin | Sadece `MigrateStatuses` endpoint'i için kullanılır |

---

## 2. Teknoloji Stack'i

### Backend
- **Framework:** ASP.NET Core (.NET, C#)
- **Veritabanı:** Google Cloud Firestore (NoSQL)
- **Kimlik Doğrulama:** JWT Bearer Token
- **Gerçek Zamanlı:** SignalR (`/hubs/tracking`)
- **Rate Limiting:** ASP.NET Core built-in (`Microsoft.AspNetCore.RateLimiting`)
- **Şifre Hashleme:** ASP.NET Core Identity `IPasswordHasher<User>` (PBKDF2)
- **Deployment:** Render.com (Docker container)

### Frontend
- **Framework:** React 18 + TypeScript + Vite
- **Routing:** React Router DOM v6
- **Gerçek Zamanlı:** `@microsoft/signalr` client
- **Stil:** Vanilla CSS (`index.css`) — TailwindCSS kullanılmıyor
- **İkonlar:** `lucide-react`

---

## 3. Proje Dizin Yapısı

```
GoodTrack/
├── GoodTrack.API/              ← .NET Backend
│   ├── Abstractions/
│   │   ├── Repositories/       ← Repository interface'leri (5 dosya)
│   │   └── Services/           ← Service interface'leri (5 dosya)
│   ├── Constants/
│   │   ├── OrderStatus.cs      ← Status string sabitleri
│   │   └── Roles.cs            ← Role string sabitleri
│   ├── Controllers/            ← 8 controller
│   ├── DTOs/
│   │   ├── Auth/               ← Auth DTO'ları
│   │   └── Product/            ← Product DTO'ları
│   ├── Hubs/
│   │   └── TrackingHub.cs      ← SignalR Hub
│   ├── Infrastructure/
│   │   ├── Converters/         ← FirestoreIsActiveConverter
│   │   └── Repositories/       ← 5 Firestore repository implementasyonu
│   ├── Middlewares/
│   │   └── ExceptionHandlingMiddleware.cs
│   ├── Models/                 ← 6 Firestore veri modeli
│   ├── Services/               ← 5 business logic servisi
│   ├── Program.cs              ← DI, JWT, CORS, Rate Limiting, SignalR konfigürasyonu
│   ├── appsettings.json        ← Config (gitignore'da)
│   └── firebase-key.json       ← Firebase credentials (gitignore'da)
│
└── client-app/                 ← React Frontend
    └── src/
        ├── App.tsx             ← Provider hiyerarşisi + AppContent
        ├── routes/
        │   └── AppRoutes.tsx   ← Tüm route tanımları
        ├── components/
        │   ├── Layout.tsx      ← Navigasyon + sayfa çerçevesi
        │   ├── auth/           ← AuthPage, VerificationPending
        │   ├── catalog/        ← CatalogPage, CatalogForm, CatalogItemCard
        │   ├── connections/    ← ConnectionsPage
        │   ├── home/           ← LandingPage
        │   ├── mfr/            ← MfrPage, MfrOrderCard, DefectDetailsModal, BrokenReportModal
        │   ├── orders/         ← OrderDetailPage
        │   ├── profile/        ← MyAccountPage, UserProfileDetailPage + alt bileşenler
        │   ├── seller/         ← SellerPage, SellerOrderCard + 7 bileşen
        │   └── ui/             ← Toast, Modal, Lightbox
        ├── context/            ← 6 React Context
        ├── hooks/              ← 13 custom hook
        ├── services/
        │   ├── api.ts          ← Tüm API çağrıları + TypeScript interface'leri
        │   └── translations.ts ← TR/EN çeviri kataloğu
        ├── constants/
        │   ├── authKeys.ts     ← localStorage key sabitleri + event adları
        │   └── routes.ts       ← ROUTES sabiti (URL path'leri)
        ├── types/
        │   └── orders.ts       ← ListFilter, SellerTabId tipleri
        └── utils/
            ├── constants.ts    ← ORDER_STATUS, ROLES, MANUFACTURER_CATEGORIES
            ├── errorUtils.ts   ← extractErrorMessage(err: unknown): string
            ├── imageHelper.ts  ← compressImage() yardımcısı
            └── statusConfig.ts ← getStatusConfig(), getSellerCardAccent(), getMfrCardAccentColor()
```

---

## 4. Backend Veri Modelleri (Firestore Collections)

### `Product` — Koleksiyon: `products`
| Alan | Tip | Firestore Key | Açıklama |
|------|-----|---------------|----------|
| Id | string | (document id) | Auto-generated |
| Code | string | `code` | Ürün/sipariş kodu |
| Image | string? | `image` | Base64 encoded görsel |
| Text | string? | `text` | Serbest metin |
| Length | string? | `length` | Boy/uzunluk |
| Extras | `Dictionary<string, ExtraValue>?` | `extras` | Dinamik ek alanlar |
| Completed | bool | `completed` | Üretici tamamladı mı? |
| IsDefective | bool | `isDefective` | Hatalı bildirim var mı? |
| IsPendingApproval | bool | `isPendingApproval` | Onay bekliyor mu? |
| IsReproduction | bool | `isReproduction` | Yeniden üretim mi? |
| DefectNote | string? | `defectNote` | Hata açıklaması |
| DefectImage | string? | `defectImage` | Hata görseli (Base64) |
| Status | string | `status` | Sipariş durumu (bkz. OrderStatus) |
| Logs | `List<OrderLog>` | `logs` | Durum geçmişi |
| CreatedAt | string | `createdAt` | ISO 8601 format (`o`) |
| CompletedAt | string? | `completedAt` | Tamamlanma zamanı |
| SellerId | string | `sellerId` | Satıcı user ID'si |
| ManufacturerId | string | `mfrId` | Üretici user ID'si |
| SellerName | string | `sellerName` | Satıcı username |
| ManufacturerName | string | `mfrName` | Üretici username |
| CancelRequested | bool | `cancelRequested` | İptal talebi var mı? |

#### `ExtraValue` (embedded)
| Alan | Tip | Açıklama |
|------|-----|----------|
| Name | string | Alan adı |
| Type | string | `"text"` veya `"select"` |
| Value | string | Girilen değer |

#### `OrderLog` (embedded list içinde)
| Alan | Tip | Açıklama |
|------|-----|----------|
| Timestamp | string | ISO 8601 |
| Status | string | Yeni durum |
| Message | string | Açıklama |
| UserId | string | İşlemi yapan kullanıcı |
| UserName | string | İşlemi yapan kullanıcı adı |

---

### `User` — Koleksiyon: `users`
| Alan | Tip | Firestore Key | Açıklama |
|------|-----|---------------|----------|
| Id | string | (document id) | Firebase document ID |
| Username | string | `username` | Küçük harf, trim edilmiş |
| PasswordHash | string | `passwordHash` | PBKDF2 hash |
| Role | string | `role` | `"seller"` veya `"mfr"` |
| FirstName | string | `firstName` | |
| LastName | string | `lastName` | |
| Email | string | `email` | |
| PhoneNumber | string | `phoneNumber` | |
| ProfilePicture | string | `profilePicture` | Base64 veya boş string |
| Address | string | `address` | |
| City | string | `city` | Üretici arama filtresi |
| Bio | string | `bio` | |
| ProductImages | `List<string>` | `productImages` | Portföy görselleri (Base64) |
| Keywords | `List<string>` | `keywords` | Uzmanlık etiketleri |
| IsVisibleToSellers | bool | `isVisibleToSellers` | Satıcı arama sonuçlarında görünsün mü? |
| CreatedAt | string | `createdAt` | |
| AssociatedUserIds | `List<string>` | `associatedUserIds` | Bağlı kullanıcı ID listesi |
| IsActive | bool | `isActive` | Hesap aktif mi? (şu an her zaman true) |
| VerificationToken | string | `verificationToken` | Ölü kod — kullanılmıyor |
| VerificationTokenExpiresAt | string | `verificationTokenExpiresAt` | Ölü kod |
| RefreshToken | string | `refreshToken` | Yenileme anahtarı (Refresh Token) |
| RefreshTokenExpiryTime | string | `refreshTokenExpiryTime` | Refresh Token son geçerlilik zamanı (ISO 8601) |

---

### `ConnectionRequest` — Koleksiyon: `connectionRequests`
| Alan | Tip | Açıklama |
|------|-----|----------|
| Id | string | Document ID |
| SenderId | string | İstek gönderen user ID |
| SenderUsername | string | |
| ReceiverId | string | İstek alan user ID |
| ReceiverUsername | string | |
| Status | string | `"pending"`, `"accepted"`, `"rejected"` |
| CreatedAt | string | ISO 8601 |

---

### `CatalogProduct` — Koleksiyon: `catalogProducts`
| Alan | Tip | Açıklama |
|------|-----|----------|
| Id | string | Document ID |
| SellerId | string | Hangi satıcıya ait |
| ProductCode | string | |
| Image | string | Base64 (zorunlu) |
| ManufacturerId | string | (`mfrId`) Atandığı üretici |
| ManufacturerName | string | (`mfrName`) |
| Text | string? | |
| Length | string? | |
| Extras | `Dictionary<string, ExtraValue>?` | |
| CreatedAt | string | |

---

### `ExtraFieldDef` — Koleksiyon: `extraFieldDefs`
| Alan | Tip | Açıklama |
|------|-----|----------|
| Id | string | Document ID |
| Name | string | Alan adı (örn. "Renk") |
| Type | string | `"text"` veya `"select"` |
| Options | `List<string>` | Select tipiyse seçenekler |
| CreatedBy | string | Oluşturan seller ID |

---

## 5. Order Status Akışı

### Backend Sabiti: `Constants/OrderStatus.cs`
### Frontend Sabiti: `utils/constants.ts → ORDER_STATUS`

```
awaiting       → Satıcı sipariş oluşturdu, üretici onayı bekliyor
production     → Üretici üretime aldı
completed      → Üretici tamamladı
to_ship        → Satıcı onayı bekliyor / sevkiyata hazır
delivered      → Teslim edildi
defective      → Üretici hata bildirdi (defect image + note ile)
missing        → Üretici eksik bildirdi
broken         → Satıcı bozuk bildirdi
corrected      → Satıcı düzeltme onayladı
shipped        → Kargo gönderildi
cancelled      → İptal edildi (cancel request flow ile)
```

### Durum Geçişleri (ProductService.cs → UpdateOrderStatusAsync)
- `seller` rolü: `to_ship`, `delivered`, `shipped`, `cancelled`, `corrected` yapabilir
- `mfr` rolü: `production`, `completed`, `defective`, `missing`, `to_ship`, `cancelled` yapabilir
- Kimin hangi duruma geçebileceği `ProductService.cs` içinde kontrol edilir

---

## 6. Backend API Endpoint'leri

**Base URL:** `/api`  
**Tüm `/auth/register` ve `/auth/login` hariç tüm endpoint'ler JWT Bearer Token gerektirir**

### Auth Controller — `/api/auth`

| Method | Endpoint | Rate Limit | Yetki | Açıklama |
|--------|----------|------------|-------|----------|
| POST | `/auth/register` | `auth-strict` (5/dk) | Public | Kullanıcı kaydı. Body: `{username, password, confirmPassword, firstname, lastname, email, phoneNumber, role}` |
| POST | `/auth/login` | `auth-strict` | Public | Login. Response: `{token, refreshToken, username, role, userId, message}` |
| POST | `/auth/refresh` | | Public | Access token yenileme. Body: `{token, refreshToken}`. Response: `{token, refreshToken, username, role, userId, message}` |
| POST | `/auth/verify-password` | `auth-strict` | Authenticated | Şifre doğrula. Body: `{password}`. Response: `{success, message}` |
| POST | `/auth/change-password` | `auth-strict` | Authenticated | Şifre değiştir. Body: `{oldPassword, newPassword, confirmNewPassword}` |

### Connections Controller — `/api/connections`

| Method | Endpoint | Yetki | Açıklama |
|--------|----------|-------|----------|
| GET | `/connections` | Authenticated | Bağlı kullanıcılar listesi |
| POST | `/connections?username={x}` | Authenticated | Bağlantı isteği gönder |
| DELETE | `/connections/{targetId}` | Authenticated | Bağlantıyı kaldır |
| GET | `/connections/requests/incoming` | Authenticated | Gelen istekler |
| GET | `/connections/requests/sent` | Authenticated | Gönderilen istekler |
| PATCH | `/connections/requests/{requestId}` | Authenticated | İstek cevapla. Body: `{status: "accepted"/"rejected"}` |
| DELETE | `/connections/requests/{requestId}` | Authenticated | Gönderilen isteği iptal et |

### Products Controller — `/api/products`

| Method | Endpoint | Yetki | Açıklama |
|--------|----------|-------|----------|
| GET | `/products` | Authenticated (seller/mfr) | Role'e göre filtrelenmiş ürünler |
| GET | `/products/{id}` | Authenticated | Sipariş detayı |
| POST | `/products` | `seller` | Yeni sipariş oluştur |
| PUT | `/products/{id}` | `seller` | Siparişi güncelle |
| DELETE | `/products/{id}` | `seller` | Siparişi sil |
| PUT | `/products/{id}/status` | Authenticated | Durum güncelle. Body: `{status, defectNote?, defectImage?}` |
| POST | `/products/{id}/cancellation-requests` | `seller` | İptal talebi gönder |
| PATCH | `/products/{id}/cancellation-requests` | `mfr` | İptal talebini cevapla. Body: `{approve: bool}` |
| POST | `/products/status-migrations` | `admin` | DB migration (admin only) |

### Catalog Controller — `/api/catalog`

| Method | Endpoint | Yetki | Açıklama |
|--------|----------|-------|----------|
| GET | `/catalog` | `seller` | Kendi katalog ürünlerini listele |
| POST | `/catalog` | `seller` | Katalog ürünü ekle |
| PUT | `/catalog/{id}` | `seller` | Katalog ürünü güncelle |
| DELETE | `/catalog/{id}` | `seller` | Katalog ürünü sil |

### Fields Controller — `/api/fields`

| Method | Endpoint | Yetki | Açıklama |
|--------|----------|-------|----------|
| GET | `/fields` | `seller` | Ekstra alan tanımlarını listele |
| POST | `/fields` | `seller` | Yeni alan tanımı oluştur |
| DELETE | `/fields/{id}` | `seller` | Alan tanımını sil |

### Profile Controller — `/api/profile`

| Method | Endpoint | Yetki | Açıklama |
|--------|----------|-------|----------|
| GET | `/profile` | Authenticated | Kendi profilini getir |
| PUT | `/profile` | Authenticated | Profili güncelle |
| GET | `/profile/{username}` | Authenticated | Başka kullanıcının profilini getir |

### Manufacturers Controller — `/api/manufacturers`

| Method | Endpoint | Yetki | Açıklama |
|--------|----------|-------|----------|
| GET | `/manufacturers/search?city=&keyword=&cursor=&limit=` | `seller` | Üretici arama (paginated, cursor-based) |

### SignalR Hub — `/hubs/tracking`
- JWT token `access_token` query param ile taşınır (WebSocket handshake için)
- Events (server → client): `ReceiveOrderUpdate`, `ReceiveConnectionRequest`, `ReceiveConnectionUpdate`

---

## 7. Frontend Rotaları

```
/                           → Login değilse LandingPage, login ise role'e göre yönlendir
/login                      → AuthPage (mode="login")
/register                   → AuthPage (mode="register")
/seller/orders              → SellerPage [role: seller]
/seller/orders/:id          → OrderDetailPage [role: seller]
/seller/search-mfr          → SearchMfrPage [role: seller]
/seller/profile             → MyAccountPage [role: seller]
/seller/profile/:username   → UserProfileDetailPage [role: seller]
/seller/connections         → ConnectionsPage [role: seller]
/mfr/orders                 → MfrPage [role: mfr]
/mfr/orders/:id             → OrderDetailPage [role: mfr]
/mfr/profile                → MyAccountPage [role: mfr]
/mfr/profile/:username      → UserProfileDetailPage [role: mfr]
/mfr/connections            → ConnectionsPage [role: mfr]
*                           → Redirect to /
```

**Route Guard'lar:**
- `ProtectedRoute` — giriş yapmamışsa `/login`'e yönlendirir; yanlış roldeyse kendi ana sayfasına yönlendirir
- `PublicRoute` — giriş yapmışsa kendi ana sayfasına yönlendirir

---

## 8. Frontend Context'leri

### Provider Hiyerarşisi (App.tsx)
```
BrowserRouter
  SettingsProvider       ← En üstte — diğerleri t() ve language kullanır
    ConfirmProvider      ← SettingsProvider'a bağımlı
      ToastProvider
        AuthProvider     ← ToastProvider'a bağımlı (unauthorized toast için)
          DataProvider   ← AuthProvider'a bağımlı
            SignalRProvider ← DataProvider + AuthProvider'a bağımlı
              AppContent
```

---

### `AuthContext` (`context/AuthContext.tsx`)
**Exports:** `AuthProvider`, `useAuth()`  
**State:** `user: User | null`  
**Actions:** `login(token, username, role, userId)`, `logout()`  
**Önemli:** `localStorage`'dan initial state okunur. `auth-unauthorized` custom event'ini dinler; gelince `logout()` + toast gösterir.  
**localStorage Keys:** `AUTH_STORAGE_KEYS` (`token`, `username`, `role`, `userId`)

---

### `DataContext` (`context/DataContext.tsx`)
**Exports:** `DataProvider`, `useData()`  
**State:**
- `products: Product[]`
- `connections: ConnectionUser[]`
- `incomingRequests: ConnectionRequest[]`
- `sentRequests: ConnectionRequest[]`
- `catalogProducts: CatalogProduct[]` (sadece seller)
- `extraFieldDefs: ExtraFieldDef[]` (sadece seller)

**Actions:** `loadProducts()`, `refreshConnections()`, `loadIncomingRequests()`, `loadSentRequests()`, `loadCatalog()`, `loadExtraFields()`

**Semantik Optimistic Aksiyonlar (context'ten erişilebilir):**
- `optimisticAddSentRequest(req)` / `optimisticRemoveSentRequest(id)` / `rollbackSentRequests(prev)`
- `optimisticAddConnection(conn)` / `optimisticRemoveConnection(id)` / `rollbackConnections(prev)`
- `optimisticRemoveIncoming(id)` / `rollbackIncomingRequests(prev)`

**Optimistic UI:** `setConnections` (context-içi wrapper) — optimistic add/remove için 15 saniyelik TTL'li `Map` kullanır; `optimisticConnections`/`optimisticRemovals` ref'leri artık context dışına sızdırılmıyor.  
**Initial Load:** `user` değiştiğinde tüm data yüklenir; logout'ta temizlenir.

---

### `SettingsContext` (`context/SettingsContext.tsx`)
**Exports:** `SettingsProvider`, `useSettings()`  
**State:** `theme: 'dark' | 'light'`, `language: Language` ('tr' | 'en')  
**Actions:** `toggleTheme()`, `setLanguage(lang)`, `t(key: TranslationKey): string`  
**localStorage Keys:** `theme`, `language`  
**Tema:** `light-theme` CSS sınıfı `document.documentElement`'e eklenir/çıkarılır.

---

### `SignalRContext` (`context/SignalRContext.tsx`)
**Exports:** `SignalRProvider`, `useSignalR()`  
**Value:** `HubConnection | null`  
**Bağlantı:** Sadece `user` değiştiğinde yeniden bağlanır. Callback'ler `useRef` ile güncellenir (gereksiz reconnect'i önlemek için).  
**Events:**
- `ReceiveOrderUpdate` → `loadProducts()`
- `ReceiveConnectionRequest` → 1 sn delay sonra `loadIncomingRequests()` + `loadSentRequests()`
- `ReceiveConnectionUpdate` → 1 sn delay sonra `refreshConnections()`

---

### `ToastContext` (`context/ToastContext.tsx`)
**Exports:** `ToastProvider`, `useToast()`  
**Actions:** `showToast(message: string, isErrorOverride?: boolean)`  
**Davranış:** Hata içeren anahtar kelime (tr/en) içeriyorsa kırmızı, yoksa yeşil gösterir. Hata: 4sn, başarı: 2.5sn.

---

### `ConfirmContext` (`context/ConfirmContext.tsx`)
**Exports:** `ConfirmProvider`, `useConfirm()`  
**Actions:** `confirm(options): Promise<boolean>`  
**Kullanım:** Destructive işlemler öncesi modal onay diyaloğu. `await confirm({title, message, confirmText?, isDestructive?})`

---

## 9. Frontend Hook'ları

### `useAuthPage` (`hooks/useAuthPage.ts`)
- **Kullandığı Context'ler:** `useAuth`, `useSettings`, `useToast`
- **Sorumluluğu:** Login/Register form state ve validasyonu. `handleLogin()`, `handleRegister()`.
- **Önemli:** Phone number prefix (`+90`) + body ayrı tutulur.

### `useCatalog` (`hooks/useCatalog.ts`)
- **Kullandığı Context'ler:** `useData`, `useToast`, `useSettings`, `useConfirm`
- **Sorumluluğu:** Katalog CRUD, görsel compression, form state.
- **Return:** `connections`, `catalogProducts`, `language`, `t`, `editingProduct`, form state, tüm handler'lar.

### `useConnections` (`hooks/useConnections.ts`)
- **Kullandığı Context'ler:** `useAuth`, `useData`, `useToast`, `useSettings`, `useConfirm`
- **Sorumluluğu:** Bağlantı isteği gönder, kabul et, reddet, sil, bağlantı kaldır.

### `useMfrOrders` (`hooks/useMfrOrders.ts`)
- **Kullandığı Context'ler:** `useData`, `useToast`, `useSettings`
- **Sorumluluğu:** MfrPage için tüm state ve logic. Tab yönetimi, sıralama, defect modal, unseen badge sayısı (`localStorage` ile: `seen_mfr_{id}` key'i).
- **Return:** `activeTab`, `sortOrder`, `filteredProducts`, `sortedProducts`, `badgeCounts`, `selectedDefectProduct`, `isDetailsModalOpen`, modal handler'ları, `handleToggleComplete`, `handleMarkSingleAsSeen`, `onRespondCancel`.

### `useOrderDetail` (`hooks/useOrderDetail.ts`)
- **Kullandığı Context'ler:** `useSettings`
- **Sorumluluğu:** Sipariş detay sayfası için ürünü `api.getProductById()` ile çeker.

### `usePasswordChange` (`hooks/usePasswordChange.ts`)
- **Kullandığı Context'ler:** `useToast`, `useSettings`
- **Sorumluluğu:** 3 adımlı şifre değiştirme akışı (verify → new → confirm).

### `useProfile` (`hooks/useProfile.ts`)
- **Kullandığı Context'ler:** `useAuth`, `useToast`, `useSettings`
- **Sorumluluğu:** Profil düzenleme state ve handler'ları (avatar, bio, keywords, product images). 338 satır, 44 return değeri.

### `useSearchMfr` (`hooks/useSearchMfr.ts`)
- **Kullandığı Context'ler:** `useData`, `useSettings`, `useAuth`, `useToast`
- **Sorumluluğu:** Üretici arama (city, keyword filtreleri), pagination (cursor-based), bağlantı isteği gönderme.
- **⚠️ Teknik Borç:** Şu an backend'deki `SearchManufacturersAsync(city, keyword)` parametrelerini kullanmıyor, tüm listeyi çekip client'ta filtreli gösteriyor.

### `useSellerOrderActions` (`hooks/useSellerOrderActions.ts`)
- **Kullandığı Context'ler:** `useData`, `useToast`, `useSettings`, `useConfirm`
- **Sorumluluğu:** Defect modal state, defect/missing bildirim, iptal talebi, iptal yanıtı, onay toggle.

### `useSellerOrderBadges` (`hooks/useSellerOrderBadges.ts`)
- **Sorumluluğu:** Seller dashboard tab'larındaki badge sayılarını hesaplar.

### `useSellerOrderForm` (`hooks/useSellerOrderForm.ts`)
- **Kullandığı Context'ler:** `useData`, `useToast`, `useSettings`, `useConfirm`
- **Sorumluluğu:** Sipariş oluşturma/düzenleme formu. Katalog auto-fill, görsel compression, field yönetimi, CRUD.

### `useSellerOrders` (`hooks/useSellerOrders.ts`)
- **Sorumluluğu:** SellerPage için coordinator hook. Diğer hook'ları (Form, Actions, Badges) bir araya getirir. Tab ve sort state yönetimi, URL query params.

### `useUserProfileDetail` (`hooks/useUserProfileDetail.ts`)
- **Sorumluluğu:** Başka kullanıcının profil sayfası için `api.getProfileByUsername()` çağrısı.

---

## 10. Frontend Bileşenleri

### Layout.tsx (`components/Layout.tsx`)
- Navigation bar — rol bazlı renkli menü butonları
- Seller: Orders, New Order, Catalog, Search, Profile, Connections
- Mfr: Orders, Profile, Connections
- Theme toggle, Language toggle (TR/EN)
- `ROUTES` sabiti kullanılır

### Seller Bileşenleri (`components/seller/`)
| Bileşen | Açıklama |
|---------|----------|
| `SellerPage.tsx` | Ana sayfa — tab navigation, order list, form, catalog |
| `SellerOrderCard.tsx` | Tek sipariş kartı (status badge, tarih, butonlar) |
| `OrderForm.tsx` | Sipariş oluşturma/düzenleme formu |
| `OrderDetailsPreview.tsx` | Sipariş özet önizleme paneli |
| `OrderMenuDropdown.tsx` | 3-nokta menüsü (edit, delete, cancel request) |
| `OrderActionsBar.tsx` | Durum action butonları |
| `AddFieldModal.tsx` | Ekstra alan tanımı ekleme modalı |
| `BrokenDetailsModal.tsx` | Bozuk sipariş detay görüntüleme |
| `DefectReportModal.tsx` | Defect/missing bildirimi formu |
| `SearchMfrPage.tsx` | Üretici arama + filtreleme + bağlantı gönderme |

### Mfr Bileşenleri (`components/mfr/`)
| Bileşen | Açıklama |
|---------|----------|
| `MfrPage.tsx` | Ana sayfa — tab navigation, sipariş listesi |
| `MfrOrderCard.tsx` | Tek sipariş kartı (üretici tarafı, defect butonları) |
| `DefectDetailsModal.tsx` | Defect detay görüntüleme (not + görsel) |
| `BrokenReportModal.tsx` | Broken bildirimi formu |

### Profil Bileşenleri (`components/profile/`)
| Bileşen | Açıklama |
|---------|----------|
| `MyAccountPage.tsx` | Kendi profil düzenleme sayfası |
| `UserProfileDetailPage.tsx` | Başka kullanıcının profil sayfası |
| `PasswordChangeForm.tsx` | 3 adımlı şifre değiştirme formu |
| `GeneralProfileFields.tsx` | Genel profil alanları |
| `MfrBusinessFields.tsx` | Üretici özgü alanlar (keywords, visibility, gallery) |
| `ProfileAvatarSection.tsx` | Avatar yükleme/görüntüleme |
| `ProductShowcaseGallery.tsx` | Portföy görseli yönetimi |

### Ortak Bileşenler (`components/ui/`)
| Bileşen | Açıklama |
|---------|----------|
| `Toast.tsx` | Global toast bildirimi |
| `Modal.tsx` | Temel modal wrapper |
| `Lightbox.tsx` | Görsel lightbox |

---

## 11. Frontend Servisler ve Yardımcılar

### `services/api.ts` — API Client
- `BASE_URL`: Hostname'e göre dynamic (localhost → `/api`, production → `https://goodtrack.onrender.com/api`)
- `getHubUrl(path)`: SignalR hub URL'i üretir
- `apiFetch()`: JWT token ekler, 401'de `auth-unauthorized` event dispatch eder
- `apiCall<T>()`: Response parse eder, hata mesajlarını handle eder (502, 404, 500 için özel mesajlar)
- `api` object: Tüm API metodları (login, register, connections, products, catalog, fields, profile, manufacturers)

**TypeScript Interface'leri (api.ts içinde tanımlı):**
- `User` — `{token, refreshToken, username, role, userId}`
- `UserProfile` — Tam profil verisi
- `ConnectionUser` — `{id, username, role}`
- `ConnectionRequest` — Bağlantı isteği
- `CatalogProduct` — Katalog ürünü
- `ExtraFieldDef` — Alan tanımı
- `ExtraFieldValue` — Alan değeri
- `OrderLog` — Sipariş log girişi
- `Product` — Tam ürün/sipariş verisi
- `RegisterPayload`, `CreateProductPayload`, `CreateCatalogProductPayload`, `UpdateCatalogProductPayload`, `CreateFieldPayload` — API request payload'ları

### `services/translations.ts`
- `Language = 'tr' | 'en'`
- `TranslationKey` — Tüm translation key'lerinin union tipi
- `translations: Record<Language, Record<TranslationKey, string>>` — TR/EN metin sözlüğü
- **Kullanım:** `const { t } = useSettings(); t('someKey')`

### `utils/errorUtils.ts`
```typescript
function extractErrorMessage(err: unknown): string
// err instanceof Error → err.message
// typeof err === 'string' → err
// otherwise → String(err)
```

### `utils/imageHelper.ts`
- `compressImage(file: File, maxWidth, maxHeight, quality): Promise<string>` — Canvas kullanarak görsel sıkıştırır ve Base64 döner

### `utils/statusConfig.ts`
- `getStatusConfig(status, t, options?)` — Status'a göre renk/ikon/label konfigürasyonu döner
- `getSellerCardAccent(status)` — Seller order kartı için left bar rengi
- `getMfrCardAccentColor(status)` — Mfr order kartı için accent rengi

### `constants/authKeys.ts`
```typescript
AUTH_STORAGE_KEYS = { token, username, role, userId }
AUTH_EVENTS = { unauthorized: 'auth-unauthorized' }
MFR_SEEN_KEY_PREFIX = 'seen_mfr_'   // localStorage prefix
```

### `constants/routes.ts`
```typescript
ROUTES = { mfrOrders, mfrProfile, mfrConnections, sellerOrders, sellerProfile, sellerSearch, sellerConnections }
```

---

## 12. Backend Servisler

### `AuthService.cs` (652 satır)
**Sorumluluklar:**
- `RegisterAsync` — Kullanıcı kaydı, duplicate kontrol, hash
- `LoginAsync` — Şifre doğrulama, Access Token ve Refresh Token üretimi (Access Token: 15 dakika, Refresh Token: 7 gün)
- `RefreshTokenAsync` — Süresi geçmiş Access Token ve geçerli Refresh Token ile yeni bir token çifti üretme
- `GetConnectionsAsync` / `RemoveConnectionAsync`
- `SendConnectionRequestAsync` — Sadece seller → mfr veya mfr → seller gönderebilir
- `GetIncomingRequestsAsync` / `GetSentRequestsAsync`
- `AcceptConnectionRequestAsync` — `AssociatedUserIds` iki tarafa da eklenir, SignalR ile bildirilir
- `RejectConnectionRequestAsync` / `DeleteConnectionRequestAsync`
- `GetProfileAsync` / `GetProfileByUsernameAsync` — `MapToProfileDto()` private helper kullanır
- `UpdateProfileAsync` — Profil günceller, eski görseli siler
- `SearchManufacturersAsync` — `isVisibleToSellers=true` olan mfr'ları cursor-based paginate eder
- `VerifyPasswordAsync` / `ChangePasswordAsync`
- `MapToProfileDto()` — private helper (tekrar azaltmak için extract edildi)
- `MapToConnectionRequestDto()` — private helper

**JWT:** Access token süresi `AddMinutes(15)` olarak tanımlıdır. Signing key `JWT_KEY` env var'dan okunur, yoksa `Jwt:Key` config'den. Production'da default key kullanılırsa startup'ta throw atılır.

---

### `ProductService.cs` (yaklaşık 700 satır)
**Sorumluluklar:**
- `GetUserProductsAsync` — Role'e göre (seller: kendi siparişleri, mfr: kendisine gelen)
- `CreateOrderAsync` — İlk log kaydı ile birlikte kayıt, SignalR bildirim
- `UpdateProductAsync` — Görsel değişmişse eski silme
- `DeleteProductAsync` — IDOR kontrolü (sadece sipariş sahibi silebilir)
- `UpdateOrderStatusAsync` — Merkezi durum geçiş metodu; role ve status doğrulaması yapar; defect için görsel kaydetme ve eski silme içerir; log append eder; SignalR bildirim
- `GetProductByIdAsync` — IDOR kontrolü (sadece seller veya ürünün mfr'ı görebilir)
- `MigrateProductStatusesAsync` — Admin: eski bool-based statusları string'e çevirir
- `RequestOrderCancellationAsync` — `cancelRequested=true` set eder, mfr'a SignalR bildirim
- `RespondToOrderCancellationAsync` — approve: status=cancelled; reject: cancelRequested=false

---

### `CatalogService.cs`
- Seller'ın kendi katalog ürünleri CRUD
- Görsel değişiminde eski Base64 silinir

### `FieldService.cs`
- Seller'ın extra field definition'larını CRUD

### `Base64ImageStorageService.cs`
- `StoreImageAsync(base64)` — `data:image` ile başladığını kontrol eder, Firestore'a kaydeder
- `DeleteImageAsync(storedBase64)` — Eski görseli siler

---

## 13. Backend Güvenlik

| Katman | Mekanizma |
|--------|-----------|
| Kimlik Doğrulama | JWT Bearer Token (Access: 15 dk, Refresh: 7 gün) |
| Yetkilendirme | `[Authorize]` + `[Authorize(Roles="seller"/"mfr")]` |
| IDOR Koruması | `ProductService` ve `AuthService`'de `userId` sahiplik kontrolü |
| Rate Limiting | `auth-strict`: 5/dk, `api-general`: 60/dk |
| CORS | `appsettings.json` + `CORS_ALLOWED_ORIGINS` env var whitelist |
| Error Handling | `ExceptionHandlingMiddleware` — stack trace sızdırmaz |
| Şifre | PBKDF2 (ASP.NET Identity `IPasswordHasher<User>`) |
| JWT Key | Production'da default key kullanımı startup'ta `throw` atar |

---

## 14. Deployment

### Konfigürasyon (Render.com ortam değişkenleri)
| Env Var | Açıklama |
|---------|----------|
| `JWT_KEY` | JWT signing key (zorunlu, production'da değiştirilmeli) |
| `FIREBASE_CREDENTIALS_JSON` | Firebase service account JSON (alternatif olarak dosya) |
| `CORS_ALLOWED_ORIGINS` | Virgülle ayrılmış izinli origin'ler |

### Frontend URL Konfigürasyonu
- `VITE_API_URL` — Development API URL (varsayılan: `/api`)
- `VITE_PRODUCTION_API_URL` — Production API URL

### Dockerfile
`GoodTrack/Dockerfile` — Backend + frontend build (wwwroot'a kopyalama) + SPA fallback

---

## 15. Bilinen Teknik Borçlar (Kod Kalitesi)

### Kritik Değil, Ama Bilinmeli
1. **Ölü Email Verification Kodu:** `User.VerificationToken`, `User.VerificationTokenExpiresAt` alanları var; `VerifyEmailAsync` metodu var; ancak hiç çağrılmıyor. `IsActive` her zaman `true` set ediliyor. E-posta doğrulama sistemi devre dışı.

2. ~~**`useSearchMfr.ts` — Client-Side Filtering:** Backend'in arama parametrelerini kullanmıyor; tüm üreticileri çekip browser'da filtreli gösteriyor. Çok sayıda üretici olursa performans sorunu yaratır.~~ **✅ Düzeltildi:** `city` ve `keyword` parametreleri backend'e gönderiliyor; `hasMore` artık backend `nextCursor`'una göre hesaplanıyor. `mustHaveGallery` / `mustHaveAvatar` toggle filtreleri client-side kalmaya devam ediyor (Firestore sorgusu yapılamaz).

3. ~~**`DataContext` Raw Setter'lar:** `setProducts`, `setConnections` vb. context'ten direkt erişilebilir, iş mantığını bypass edebilir.~~ **✅ Düzeltildi:** Raw dispatcher'lar (`setConnections`, `setIncomingRequests`, `setSentRequests`, `setProducts`) context type'ından kaldırıldı. Her optimistic senaryo için semantik aksiyonlar eklendi (`optimisticAddSentRequest`, `optimisticRemoveConnection`, `rollbackConnections` vb.). `optimisticConnections`/`optimisticRemovals` ref'leri de artık context dışına sızdırılmıyor.

4. ~~**Inline `language === 'tr' ? ... : ...` Ternary'ler:** `MfrOrderCard`, `OrderForm`, `SellerOrderCard`, `OrderMenuDropdown`, `ConfirmContext` gibi dosyalarda tarih formatlama ve bazı UI metinleri için `t()` sistemi yerine inline ternary kullanılıyor.~~ **✅ Düzeltildi:** Tüm inline `language ===` ternary'ler `t()` çağrılarıyla değiştirildi. `dateLocale` (`tr-TR`/`en-US`), `langToggleLabel`, `fieldRequired`, `editOrderHeading`, `cancelReqApprove`, `rejectRequestTitle`, `removeConnectionTitle` vb. 20+ yeni anahtar `translations.ts`'e eklendi. `language` artık kullanılmayan bileşenlerden (`MfrOrderCard`, `SellerOrderCard`, `OrderDetailsPreview`, `OrderMenuDropdown`, `OrderForm`, `ConfirmContext`, `useOrderDetail`) temizlendi.

5. **`CreateCatalogProductPayload` ve `UpdateCatalogProductPayload`:** Özdeş interface'ler, birleştirilebilir.

6. ~~**JWT Token Süresi:** 7 gün — refresh token mekanizması yok.~~ **✅ Düzeltildi:** Access Token süresi 15 dakikaya düşürüldü ve 7 günlük Refresh Token mekanizması eklendi. İstemci 401 hatası aldığında sessizce token yenileyen interceptor entegre edildi.

7. **Base64 Görsel Boyut Kontrolü Eksik:** Backend'de max boyut kontrolü yapılmıyor.

---

## 16. Kod Kalitesi Standartları (Bu Projede Uygulanan)

- **TypeScript:** `catch (err: unknown)` + `extractErrorMessage(err)` pattern — `catch (err: any)` yok
- **Bileşen tanımı:** `export default function ComponentName({ prop }: Props) {...}` — `React.FC` kullanılmıyor
- **Hook'lar:** Tüm state + side effect + API çağrıları hook'larda; bileşenler saf presentational
- **Stiller:** İnline style yok (CSS sınıfları) — `index.css`'de tanımlı
- **Sabitler:** Magic string yok; `ORDER_STATUS`, `ROLES`, `AUTH_STORAGE_KEYS`, `ROUTES`, `MFR_SEEN_KEY_PREFIX` kullanılır
- **Backend:** `BaseApiController.GetCurrentUserId()` helper — her controller'da tekrar eden userId kodu yok
- **Backend:** `ExceptionHandlingMiddleware` — try/catch boilerplate controller'larda yok
- **Backend:** `Roles.cs` ve `OrderStatus.cs` sabit sınıfları — magic string yok
- **Console Log:** Sadece `import.meta.env.DEV` kontrolü altında veya `console.error` (hata durumları)

---

## 17. CSS Tasarım Sistemi

CSS değişkenleri `index.css`'de `:root` altında tanımlı:
- `--text`, `--muted`, `--bg`, `--border`, `--surface`
- `--accent-seller`, `--accent-seller-glow` (amber/turuncu tema — seller için)
- `--accent-mfr`, `--accent-mfr-glow` (cyan tema — üretici için)
- `--danger` (kırmızı — destructive işlemler)

Light tema: `html.light-theme` sınıfıyla değişkenler override edilir.

Tip aralığı: `font-family: 'Bebas Neue'` (logo/başlıklar), `'Inter'` veya `'Outfit'` (body)

---

## 18. Proje Durumu (Haziran 2026)

- ✅ TypeScript: 0 derleme hatası
- ✅ Production build: Başarılı
- ✅ Güvenlik: Kritik açık yok
- ✅ Git branch: `develop` (Render.com'a deploy edilmiş)
- ✅ Refactoring: 14 adımlık inline style ve translation cleanup tamamlandı
- ⚠️ JWT key production'da env var olarak set edilmeli (`JWT_KEY`)
- ⚠️ CORS `CORS_ALLOWED_ORIGINS` production URL'leri ile set edilmeli
