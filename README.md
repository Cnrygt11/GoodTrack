# GoodTrack — Sipariş ve Ürün Takip Sistemi

GoodTrack, Etsy mağazası olan **satıcılar** ile ürünleri fiziksel olarak imal eden **üreticiler** arasındaki sipariş sürecini uçtan uca, gerçek zamanlı yöneten bir web uygulamasıdır. Satıcı Etsy'de satar; ürünü ise bir imalat atölyesine yaptırır. GoodTrack, "hangi sipariş kimde, hangi aşamada, kusurlu mu, kargolandı mı" akışını tek yerden takip eder.

---

## ✨ Öne Çıkan Özellikler

* **Rol tabanlı sipariş akışı** — Satıcı ve üretici (`seller` / `mfr`) rolleri; her aksiyon role göre yetkilendirilir.
* **Durum makinesi** — Sipariş yalnızca izin verilen geçişlerle ilerler (bekliyor → üretimde → tamamlandı → teslim → kontrol → kargo). Kusurlu/eksik siparişler yeniden üretime döner.
* **Gerçek zamanlı bildirim** — Sipariş her güncellendiğinde ilgili taraflara SignalR üzerinden anlık push; arayüz otomatik tazelenir.
* **Etsy entegrasyonu** — OAuth 2.0 (salt-okunur scope) ile mağaza bağlama; ürün (listing) ve sipariş içe aktarımı; dış platform iptallerinin senkronu.
* **Kredi & plan sistemi** — Sipariş oluşturma kredi harcar; Free/Pro/Enterprise planları ve tek seferlik kredi paketleri. *(Ödeme şu an mock'tur.)*
* **Arşiv & veri saklama** — Terminal siparişler (kargolandı/iptal) arşive düşer; belirli süre sonra ağır alanlar ve müşteri PII'ı arka plan işiyle temizlenir.
* **Güvenlik** — JWT + refresh token, şifreli saklanan Etsy token'ları, güvenlik başlıkları, rate limiting, hassas veri maskeleyen loglama, audit trail.

---

## 🛠️ Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| **Backend** | ASP.NET Core 10 (Web API), Entity Framework Core, PostgreSQL |
| **Gerçek zamanlı** | SignalR (`/hubs/tracking`) |
| **Loglama** | Serilog (JSON dosya + konsol, hassas veri maskeleme) |
| **Testler** | xUnit, EF Core InMemory/SQLite (200+ birim testi) |
| **Frontend** | React 19, TypeScript, TanStack (React) Query, CSS Modules, Vite |
| **Entegrasyon** | Etsy OAuth 2.0 & Etsy API |
| **Kapsayıcı** | Docker (çok aşamalı build) |

---

## 🏗️ Proje Yapısı

```
GoodTrack/
├── GoodTrack.API/            # ASP.NET Core Web API (backend)
│   ├── Controllers/          # HTTP uç noktaları (Auth, Products, Manufacturers, Credits, Etsy...)
│   ├── Services/             # İş mantığı + arka plan servisleri (kredi yenileme, arşiv temizliği)
│   ├── Infrastructure/       # AppDbContext, repository'ler, audit, EF konfigürasyonları
│   ├── Hubs/                 # SignalR TrackingHub
│   ├── Models/               # Domain modelleri (User, Product/Sipariş, EtsyConnection...)
│   ├── Migrations/           # EF Core migration'ları
│   └── Program.cs            # Uygulama başlangıcı ve HTTP pipeline
├── GoodTrack.API.Tests/      # xUnit birim testleri
├── client-app-redesign/      # React + TypeScript istemci (frontend)
└── docs/                     # Proje dokümanları ve kontrol listeleri
```

---

## 🚀 Yerel Kurulum ve Çalıştırma

### Gereksinimler
* .NET SDK 10.0+
* Node.js 20+ & npm
* Çalışan bir PostgreSQL örneği

### 1. Yapılandırma (Secret'lar)

Secret'lar **`appsettings.json`'a yazılmaz**; geliştirmede `dotnet user-secrets`, production'da environment variable ile sağlanır. Şablon için `GoodTrack.API/appsettings.Example.json` dosyasına bakın.

`GoodTrack.API` klasöründe en az şunları tanımlayın:

```bash
cd GoodTrack.API
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Port=5432;Database=goodtrack;Username=postgres;Password=postgres"
dotnet user-secrets set "Jwt:Key" "<en az 32 karakterlik güçlü anahtar>"

# (Opsiyonel) Etsy entegrasyonu için:
dotnet user-secrets set "Etsy:Keystring" "<etsy-keystring>"
dotnet user-secrets set "Etsy:SharedSecret" "<etsy-shared-secret>"

# (Opsiyonel) Admin kaydı için:
dotnet user-secrets set "ADMIN_REGISTRATION_SECRET" "<admin-kayıt-anahtarı>"
```

### 2. Backend'i Çalıştırma

```bash
cd GoodTrack.API
dotnet run
```

* API varsayılan olarak `http://localhost:5244` adresinde çalışır.
* Migration'lar başlangıçta uygulanır; DB sağlığı `GET /health` üzerinden doğrulanır.
* Geliştirme ortamında OpenAPI şeması `http://localhost:5244/openapi/v1.json` adresinden erişilebilir.

### 3. Frontend'i Çalıştırma

```bash
cd client-app-redesign
npm install
npm run dev
```

* İstemci tarayıcıda `http://localhost:5173` adresinde açılır.
* Yerel geliştirmede Etsy OAuth için istemcinin API adresini bilmesi gerekir (`VITE_API_URL` ortam değişkeni).

---

## 🔄 Sipariş Yaşam Döngüsü

Siparişler, sadece izin verilen geçişleri kabul eden bir durum makinesiyle yönetilir (`Services/OrderWorkflowService.cs`):

```
awaiting (bekliyor)
   │   satıcı iptal edebilir · üretici "bozuk" işaretleyebilir
   ▼
production (üretimde)
   │   satıcı iptal TALEBİ gönderebilir (üretici onaylar/reddeder)
   ▼
completed (üretim tamam) ─► delivered (teslim edildi)
                               │  satıcı kontrolü:
                               ├─► to_ship ─► shipped   (doğru → kargo) ✅
                               ├─► defective (hatalı) ─┐
                               └─► missing   (eksik)   ┘─► tekrar üretime döner
```

Her geçiş; gerekli rolü, izin verilen kaynak durumu ve uygulanacak yan etkileri (kredi iadesi, görsel temizliği, log kaydı, bildirim) tanımlar. Terminal durumlar (`shipped` / `cancelled`) siparişi arşive taşır.

---

## 🧪 Testleri Çalıştırma

```bash
dotnet test
```

---

## 📐 Kod Standartları ve Otomasyon

* **EditorConfig** — Tab/space standartları ve dosya sonu boşluklarını denetler.
* **Prettier** — JS/TS/CSS dosyalarının otomatik formatlanmasını sağlar.
* **Husky** — `git commit` aşamasında formatsız/hatalı kod gönderimini engelleyen `pre-commit` hook'u.
* **CI** — Format ve build/test kapıları (bkz. `.github/`).

---

## 🚢 Dağıtım (Deploy)

Uygulama, Render üzerinde **iki ayrı servis** olarak çalışacak şekilde tasarlanmıştır: statik frontend ve API. Her sürüm güncellemesinde **ikisinin de** yeniden deploy alması gerekir; aksi halde frontend ile API arasında sürüm kayması oluşur. `Dockerfile`, çok aşamalı bir build ile frontend'i derleyip API imajına dahil eder.
