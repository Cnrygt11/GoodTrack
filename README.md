# GoodTrack — Sipariş ve Ürün Takip Sistemi

GoodTrack, Etsy mağaza entegrasyonu barındıran, satıcılar ve üreticiler arasındaki sipariş süreçlerini gerçek zamanlı yöneten modern bir web uygulamasıdır.

## 🛠️ Teknoloji Yığını

* **Backend:** ASP.NET Core 10 (Web API), Entity Framework Core, PostgreSQL, SQLite (Unit Tests), Serilog
* **Frontend:** React 19, TypeScript, TanStack (React) Query, CSS Modules
* **İletişim:** SignalR (Gerçek Zamanlı Bildirimler)
* **Kapsayıcı:** Docker, Docker Compose

---

## 🚀 Yerel Kurulum ve Çalıştırma

### Gereksinimler
* .NET SDK 10.0+
* Node.js 20+ & npm
* PostgreSQL (Docker veya yerel servis)

### 1. Veri Tabanını Ayağa Kaldırma (Docker Compose)
Kök dizinde docker-compose dosyasını başlatın:
```bash
docker-compose up -d
```

### 2. Backend API Çalıştırma
`GoodTrack.API` klasörüne gidin, `appsettings.json` içerisindeki bağlantı dizesini kontrol edin veya ortam değişkenini (environment variable) set edip çalıştırın:
```bash
cd GoodTrack.API
dotnet run
```
* API varsayılan olarak `http://localhost:5244` adresinde çalışmaya başlayacaktır.
* Swagger/OpenAPI şemasına `http://localhost:5244/openapi/v1.json` üzerinden erişebilirsiniz.

### 3. Frontend İstemci Çalıştırma
`client-app-redesign` klasörüne gidin, bağımlılıkları kurun ve geliştirici sunucusunu başlatın:
```bash
cd client-app-redesign
npm install
npm run dev
```
* İstemci tarayıcıda `http://localhost:5173` adresinde açılacaktır.

---

## 🧪 Testleri Çalıştırma

Projedeki 30+ unit testi koşturmak için kök dizinde şu komutu çalıştırın:
```bash
dotnet test
```

---

## 📐 Kod Standartları ve Otomasyon

Projede kod formatının ve kalitesinin korunması için otomatik araçlar entegre edilmiştir:
* **EditorConfig:** Tab/space standartları ve dosya sonu boşluklarını denetler.
* **Prettier:** JS/TS/CSS dosyalarının otomatik formatlanmasını sağlar.
* **Husky:** Geliştiricilerin `git commit` aşamasında hatalı veya formatsız kod göndermesini otomatik engeller (`pre-commit` hook).
