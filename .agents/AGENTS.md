## Instructions
[unknown] - Mevcut fonksiyonaliteyi bozacak değişiklik yapmadan önce mutlaka söyle ve onay iste.
[unknown] - Büyük "tek seferde her şeyi değiştir" yaklaşımı yerine küçük, test edilebilir adımlarla ilerle.
[unknown] - Emin olmadığın bir mimari karar varsa (örn. bir pattern'i uygulamak mı uygulamamak mı gerektiği) varsayım yapma, bana sor.
[unknown] - Her önemli değişiklik için nasıl test edileceğini (unit test, manuel senaryo vb.) belirt.
[unknown] - Yeni bir kütüphane/paket eklemeden önce gerekçelendir ve onay iste.
[unknown] - Controller'lar sadece HTTP isteklerini yönlendirsin; iş mantığı Service katmanında olsun.
[unknown] - Repository / Service / DTO ayrımına uy; katmanları karıştırma.
[unknown] - `new` ile sıkı bağlı (tightly coupled) nesne oluşturma yerine Dependency Injection kullan.
[unknown] - Async metotlarda `.Result` veya `.Wait()` kullanma (deadlock riski); `async/await`'i doğru zincirle.
[unknown] - Genel `catch(Exception)` ile hata yutma; anlamlı exception tipleri ve merkezi hata yönetimi (global exception middleware) kullan.
[unknown] - `Console.WriteLine` ile debug yapma; mevcut loglama altyapısını kullan.
[unknown] - Magic string/number kullanma; sabitler veya enum tanımla.
[unknown] - Connection string, API key gibi bilgileri koda gömme; configuration/environment değişkenlerinden oku.
[unknown] - Input validasyonunu backend'de de yap (sadece frontend'e güvenme).
[unknown] - API'lerden doğrudan Entity/Domain modeli dönme; DTO kullan.
[unknown] - Yeni bir kod yazarken projede zaten kullanılan konvansiyonu (isimlendirme, klasör yapısı, pattern'ler) önce incele, ona uy.
[unknown] - Component'leri küçük ve tek sorumluluklu tut; UI, state yönetimi ve API çağrısını aynı dosyada karıştırma.
[unknown] - Inline CSS (`style={{}}`) kullanma; projede belirlenmiş stil yöntemini (CSS Modules / Styled Components / Tailwind vb. — hangisi kullanılıyorsa) kullan.
[unknown] - API çağrılarını component içine gömmek yerine ayrı bir servis/hook katmanında topla.
[unknown] - Hardcoded URL/endpoint kullanma; environment değişkenlerinden oku.
[unknown] - Listelerde `key` olarak index kullanma; benzersiz bir id kullan.
[unknown] - Hata ve loading state'lerini her zaman yönet; kullanıcıya boş/sonsuz loading ekranı bırakma.
[unknown] - TypeScript kullanılıyorsa `any` tipinden kaçın.
[unknown] - Değişikliği yapmadan önce etkilenen dosyaları listele.
[unknown] - Riskli (breaking change ihtimali yüksek) değişiklikleri düşük riskli olanlardan ayrı fazlara böl.
[unknown] - Her fazdan sonra ne test edilmesi gerektiğini açıkça belirt.

## Identity
[unknown] - Location is Turkey.
[unknown] - Speaks Turkish and English.

## Career
[unknown] - Full-stack Software Developer with experience in C# / .NET Core, Entity Framework Core, PostgreSQL, SQLite, React, and TypeScript.

## Projects
[unknown] - GoodTrack is a real-time B2B order, product, and catalog tracking platform featuring a gamified manufacturer search directory and Etsy shop integration. The backend uses ASP.NET Core 10 Web API, Entity Framework Core, PostgreSQL, SQLite for in-memory testing, MediatR, FluentValidation, and Serilog. It features a Global Exception Middleware to format API responses into success/failure envelopes (ApiResponse) while sanitizing EF Core database errors. Concurrency is handled optimistically using RowVersion/xmin tokens. SignalR hubs trigger instant client updates (ReceiveOrderUpdate, ReceiveConnectionRequest, ReceiveConnectionUpdate). The system includes a custom dynamic fields template engine allowing sellers to define custom specifications (text/dropdown list values) for products. A gamified paywall prevents free plans from searching manufacturers unless they complete 20 orders or upgrade, which is enforced via 402 Payment Required credit validations. Manufacturer accounts must maintain between 3 and 10 portfolio showcase images to remain visible in search results, and a strict role-based timeline sanitizer hides buyer details/shipping logs from manufacturers past the 'to_ship' status. The Etsy integration supports OAuth2 verification, signing secret verification, listing/order sync, and mock webhooks simulating paid transactions. The frontend is built on React 19, TypeScript, TanStack Query, CSS modules, and custom HSL variables. It runs an Optimistic UI state manager (DataContext) using reference tracking maps with a 15-second TTL to eliminate layout flickers. It uses canvas-based client-side image compression (imageHelper) targeting 800x800 JPEGs. Visual features include a secure MockPaymentModal checkout simulator with a 3D flipping card animation, a promise-based ConfirmContext modal, a toast manager with smart error word parsing, and a feedback system that automatically captures browser specifications.

## Preferences
[unknown] - Prefers gradual, small, testable coding increments instead of large single-commit alterations.
[unknown] - Prefers strict architectural layering (Controller-Service-Repository-DTO) in C# backend systems.
[unknown] - Prefers modular, single-responsibility React frontend components without inline CSS.