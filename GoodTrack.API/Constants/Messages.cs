namespace GoodTrack.API.Constants;

/// <summary>
/// Kullanıcıya dönen sistem mesajlarının tek kaynağı. Aynı durum her yerde aynı metinle
/// anlatılır; yazım tutarsızlıkları ve kopya mesajlar burada tekilleşir. Yeni mesaj eklerken
/// önce buradaki gruplara bakın; birden fazla yerde kullanılacak her mesaj buraya taşınmalıdır.
/// (İleride mesaj kodu + istemci tarafı çeviri (i18n) gerektiğinde de tek dönüşüm noktası burasıdır.)
/// </summary>
public static class Messages
{
    public static class Common
    {
        public const string MissingRequestData = "İstek verisi eksik.";
    }

    public static class Auth
    {
        public const string Unauthorized = "Yetkisiz erişim.";
        public const string Forbidden = "Bu işlem için yetkiniz yok.";
        public const string UserNotFound = "Kullanıcı bulunamadı.";
        public const string InvalidCredentials = "Geçersiz kullanıcı adı veya şifre!";
        public const string WrongPassword = "Şifre hatalı.";
        public const string EmailInUse = "Bu e-posta adresi zaten kullanımda!";
        public const string InvalidEmailFormat = "Geçersiz veya şüpheli e-posta formatı!";
        public const string UsernameRequired = "Kullanıcı adı boş olamaz.";
    }

    public static class Order
    {
        public const string NotFound = "Sipariş bulunamadı!";
        public const string InvalidId = "Geçersiz sipariş ID'si.";
        public const string NoPermission = "Bu sipariş üzerinde işlem yapma yetkiniz yok.";
        public const string InvalidProductData = "Geçersiz ürün verisi veya eksik ürün kodu!";
        public const string ManufacturerRequired = "Lütfen siparişin gönderileceği üreticiyi (Manufacturer) seçin!";
    }

    public static class Catalog
    {
        public const string NotFound = "Katalog ürünü bulunamadı.";
        public const string InvalidId = "Geçersiz ürün ID'si.";
        public const string CodeRequired = "Ürün kodu zorunludur!";
        public const string ManufacturerRequired = "Ürüne atanacak üretici zorunludur!";
        public const string DuplicateCode = "Bu ürün kodu kataloğunuzda zaten kayıtlı!";
    }

    public static class Connection
    {
        public const string RequestNotFound = "Bağlantı isteği bulunamadı.";
        public const string AlreadyProcessed = "İstek zaten işlenmiş.";
    }

    public static class Image
    {
        /// <summary>Görsel boyut limiti aşıldığında; <paramref name="fieldName"/> ör. "Sipariş görseli".</summary>
        public static string TooLarge(string fieldName) => $"{fieldName} boyutu çok büyük! Maksimum 5MB desteklenmektedir.";
    }
}
