## Genel Prensipler
- Mevcut fonksiyonaliteyi bozacak değişiklik yapmadan önce mutlaka söyle ve onay iste.
- Büyük "tek seferde her şeyi değiştir" yaklaşımı yerine küçük, test edilebilir adımlarla ilerle.
- Emin olmadığın bir mimari karar varsa (örn. bir pattern'i uygulamak mı uygulamamak mı gerektiği) varsayım yapma, bana sor.
- Her önemli değişiklik için nasıl test edileceğini (unit test, manuel senaryo vb.) belirt.
- Yeni bir kütüphane/paket eklemeden önce gerekçelendir ve onay iste.

## .NET / Backend Kuralları
- Controller'lar sadece HTTP isteklerini yönlendirsin; iş mantığı Service katmanında olsun.
- Repository / Service / DTO ayrımına uy; katmanları karıştırma.
- `new` ile sıkı bağlı (tightly coupled) nesne oluşturma yerine Dependency Injection kullan.
- Async metotlarda `.Result` veya `.Wait()` kullanma (deadlock riski); `async/await`'i doğru zincirle.
- Genel `catch(Exception)` ile hata yutma; anlamlı exception tipleri ve merkezi hata yönetimi (global exception middleware) kullan.
- `Console.WriteLine` ile debug yapma; mevcut loglama altyapısını kullan.
- Magic string/number kullanma; sabitler veya enum tanımla.
- Connection string, API key gibi bilgileri koda gömme; configuration/environment değişkenlerinden oku.
- Input validasyonunu backend'de de yap (sadece frontend'e güvenme).
- API'lerden doğrudan Entity/Domain modeli dönme; DTO kullan.
- Yeni bir kod yazarken projede zaten kullanılan konvansiyonu (isimlendirme, klasör yapısı, pattern'ler) önce incele, ona uy.

## React / Frontend Kuralları
- Component'leri küçük ve tek sorumluluklu tut; UI, state yönetimi ve API çağrısını aynı dosyada karıştırma.
- Inline CSS (`style={{}}`) kullanma; projede belirlenmiş stil yöntemini (CSS Modules / Styled Components / Tailwind vb. — hangisi kullanılıyorsa) kullan.
- API çağrılarını component içine gömmek yerine ayrı bir servis/hook katmanında topla.
- Hardcoded URL/endpoint kullanma; environment değişkenlerinden oku.
- Listelerde `key` olarak index kullanma; benzersiz bir id kullan.
- Hata ve loading state'lerini her zaman yönet; kullanıcıya boş/sonsuz loading ekranı bırakma.
- TypeScript kullanılıyorsa `any` tipinden kaçın.

## Refaktör Yaparken
- Değişikliği yapmadan önce etkilenen dosyaları listele.
- Riskli (breaking change ihtimali yüksek) değişiklikleri düşük riskli olanlardan ayrı fazlara böl.
- Her fazdan sonra ne test edilmesi gerektiğini açıkça belirt.