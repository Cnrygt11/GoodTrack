# GoodTrack — Kod İnceleme ve Refactoring Talebi

Aşağıda GoodTrack projesinde tespit edilmiş **3 kritik performans sorunu** detaylandırılmıştır. Her sorun için mevcut hatalı kod ve beklenen düzeltme verilmiştir. Lütfen her birini uygula.

---

## SORUN 1 — N+1 Veritabanı Yazma Antipaterni

**Dosya:** `ProductService.cs` → `GetUserProductsAsync` metodu

### Mevcut Hatalı Kod

```csharp
// HATALI — Okuma metodunun içinde döngüsel DB yazması
foreach (var p in products)
{
    if (string.IsNullOrEmpty(p.Status))
    {
        p.Status = MapStatus(p);
        await _productRepository.SaveAsync(p);  // Her iterasyonda ayrı ağ turu!
    }
}
```

### Sorun Nedir?

- **CQRS ihlali:** Okuma (Query) metodu içinde yazma (side-effect) yapılıyor.
- **N round-trip:** 100 ürün varsa Firestore'a 100 ayrı TCP bağlantısı açılıyor.
- **Maliyet artışı:** Firestore işlem başına faturalandırır; bu pattern maliyeti doğrusal artırır.
- **Race condition riski:** Aynı anda birden fazla kullanıcı listeleme yaparsa aynı kayıtlar üzerinde yarışan write işlemleri oluşur.

### İstenen Düzeltme A — Migration Script (Tercih Edilen)

Mevcut `SaveAsync` çağrısını metodun içinden tamamen kaldır. `GetUserProductsAsync` sadece okuma yapsın:

```csharp
// DOĞRU — Saf okuma metodu, sıfır yan etki
public async Task<List<Product>> GetUserProductsAsync(string userId, string role)
{
    return role == Roles.Seller
        ? await _productRepository.GetProductsBySellerAsync(userId)
        : await _productRepository.GetProductsByManufacturerAsync(userId);
}
```

Boş `Status` alanlarını doldurmak için ayrı bir **one-off migration CLI komutu veya admin paneli endpoint'i** yaz; bunu yalnızca bir kez çalıştır.

### İstenen Düzeltme B — Batch Write (Geçiş Dönemi Alternatifi)

Eğer migration script şu an mümkün değilse, N ayrı `SaveAsync` yerine tek bir Firestore Batch kullan:

```csharp
// KABUL EDİLEBİLİR (geçici) — N yazma yerine 1 batch commit
var batch = _firestoreDb.StartBatch();
bool hasChanges = false;

foreach (var p in products)
{
    if (string.IsNullOrEmpty(p.Status))
    {
        p.Status = MapStatus(p);
        var docRef = _firestoreDb.Collection("Products").Document(p.Id);
        batch.Set(docRef, p);
        hasChanges = true;
    }
}

if (hasChanges)
    await batch.CommitAsync(); // Tüm güncellemeler tek ağ çağrısında gönderilir
```

> **Not:** Batch Write da geçici bir çözümdür. Uzun vadede bu kodu üretim akışından tamamen kaldır.

---

## SORUN 2 — Sunucuda Bellek İçi (In-Memory) Filtreleme

**Dosya:** `AuthService.cs` → `SearchManufacturersAsync` metodu

### Mevcut Hatalı Kod

```csharp
// HATALI — Veritabanı ham dosya deposu gibi kullanılıyor
var allMfrs = await _userRepository.GetManufacturersAsync(); // Tümünü çek

var query = allMfrs.Where(u => u.IsVisibleToSellers);
if (!string.IsNullOrEmpty(city))
{
    query = query.Where(u => u.City.Contains(cityClean));  // RAM'de filtrele
}
```

### Sorun Nedir?

- **Ölçeklenmez:** 10.000 üretici varken her aramada 10.000 satır Firestore'dan çekilip JSON'a çevrilip RAM'e alınıyor.
- **OOM riski:** Eşzamanlı istek sayısı arttıkça sunucu belleği tükenir.
- **İndeks atlatılıyor:** Firestore'un sorgulama motoru hiç kullanılmıyor; tüm eşleştirme uygulama katmanında yapılıyor.

### İstenen Düzeltme — Firestore Düzeyinde Sorgulama

Filtreleme kriterlerini doğrudan Firestore sorgusuna taşı:

```csharp
// DOĞRU — Filtreleme DB'de gerçekleşir, sunucuya az veri gelir
Query query = _firestoreDb.Collection("Users")
    .WhereEqualTo("Role", Roles.Mfr)
    .WhereEqualTo("IsVisibleToSellers", true);

if (!string.IsNullOrEmpty(city))
    query = query.WhereEqualTo("City", city.Trim()); // City alanına Firestore indeksi ekle

var snapshot = await query.GetSnapshotAsync();
var mfrs = snapshot.Documents.Select(doc => doc.ConvertTo<User>());
return mfrs.Select(MapToProfileDto).ToList();
```

> **Önemli Kısıt:** Firestore, tam-metin (full-text) keyword aramasını **yerel olarak desteklemez**. `keyword` parametresi için `WhereEqualTo` yeterli değildir; bu alan için **Algolia, Typesense veya Elasticsearch** entegrasyonu gereklidir. `WhereEqualTo` yalnızca tam eşleşmelerde kullanılabilir.

**Ek yapılacak:** `City` alanına Firestore Console veya Terraform üzerinden **composite index** ekle.

---

## SORUN 3 — İstemci Tarafında Filtreleme ve Sayfalama Eksikliği

**Dosya:** `useSearchMfr.ts` → `useMemo` filtresi

### Mevcut Hatalı Kod

```typescript
// HATALI — Tüm üreticiler çekilip istemcide süzülüyor
const filteredAndSortedManufacturers = useMemo(() => {
    let list = [...manufacturers]; // Tümü bellekte
    if (searchQuery.trim()) {
        list = list.filter(m => m.firstName.includes(query) || ...);
    }
    // ... şehir ve kategori filtreleri ...
    return list;
}, [manufacturers, searchQuery, selectedCities, selectedCategories]);
```

### Sorun Nedir?

- **Over-fetching:** Kullanıcı yalnızca İstanbul'daki üreticileri görmek isterken tüm ülkedeki profiller, biyografiler ve görsel URL'leri tarayıcıya indiriliyor.
- **Yavaş TTI:** Sayfa açılışında tüm veri yüklenene kadar boş ekran veya uzun loading gösteriliyor.
- **Mobil ısınması:** Binlerce öğeyi JavaScript `filter/sort` ile her render'da yeniden işlemek düşük güçlü cihazlarda UI takılmasına ve batarya tüketimine yol açıyor.
- **Sayfalama yok:** Tüm veri tek seferde çekildiğinden hem bant genişliği hem istemci belleği orantısız harcanıyor.

### İstenen Düzeltme — Sunucu Taraflı Filtreleme + Cursor Tabanlı Sayfalama

```typescript
// DOĞRU — Filtreler sunucuya gönderilir, cursor-based sayfalama
export default function useSearchMfr() {
  const [manufacturers, setManufacturers] = useState<UserProfile[]>([]);
  const [lastCursor, setLastCursor]       = useState<string | null>(null);
  const [hasMore, setHasMore]             = useState(true);

  const fetchManufacturers = useCallback(async (reset = false) => {
    const data = await api.searchManufacturers({
      city:    selectedCity,
      keyword: searchKeyword,
      cursor:  reset ? null : lastCursor,  // Firestore startAfter cursor
      limit:   10,
    });
    setManufacturers(prev => reset ? data.items : [...prev, ...data.items]);
    setLastCursor(data.nextCursor);
    setHasMore(data.items.length === 10);
  }, [selectedCity, searchKeyword, lastCursor]);
}
```

**Ek yapılacaklar:**
- `useMemo` filtrelemesini tamamen kaldır.
- `api.searchManufacturers()` çağrısını parametreli hale getir (city, keyword, cursor, limit).
- Backend'de Firestore `startAfter(lastDoc)` ile cursor tabanlı sayfalama endpoint'i yaz.

> **Cursor vs Offset:** Firestore'da `skip/take` (offset) yaklaşımı verimsizdir; her çağrıda önceki tüm belgeler okunur. `startAfter(lastDoc)` ile cursor tabanlı sayfalama hem maliyet hem hız açısından zorunludur.

---

## Özet — Öncelik Sırası

| Öncelik | Dosya | Yapılacak |
|---------|-------|-----------|
| 🔴 P0 | `ProductService.cs` | `GetUserProductsAsync` içindeki `SaveAsync` çağrısını sil. Bir kerelik migration script yaz ve çalıştır. |
| 🟠 P1 | `AuthService.cs` | `GetManufacturersAsync` yerine Firestore sorgusu kullan. `City` alanına indeks ekle. |
| 🟠 P1 | `useSearchMfr.ts` | `useMemo` filtrelemesini kaldır. Parametreli API çağrısı + cursor tabanlı sayfalama uygula. |
| 🟡 P2 | Altyapı | Keyword araması için Algolia veya Typesense entegrasyonu planla. |
