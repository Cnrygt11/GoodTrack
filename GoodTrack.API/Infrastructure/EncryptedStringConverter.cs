using System;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace GoodTrack.API.Infrastructure;

/// <summary>
/// Hassas string kolonlarını veritabanına yazmadan önce şifreler, okurken çözer
/// (ASP.NET Core Data Protection ile). Böylece Etsy OAuth token'ları ve secret'lar
/// at-rest düz metin tutulmaz — DB sızıntısında bağlı mağazalar ele geçirilemez.
///
/// Geriye dönük geçiş: çözme başarısız olursa (ör. şifreleme öncesinden kalma düz
/// metin değer) ham değer döndürülür. Böylece migration gerekmeden kademeli geçiş olur;
/// değer bir sonraki yazımda (token yenileme) şifreli olarak saklanır.
/// </summary>
public sealed class EncryptedStringConverter : ValueConverter<string, string>
{
    public EncryptedStringConverter(IDataProtector protector)
        : base(
            plaintext => protector.Protect(plaintext),
            ciphertext => Unprotect(protector, ciphertext))
    {
    }

    private static string Unprotect(IDataProtector protector, string ciphertext)
    {
        if (string.IsNullOrEmpty(ciphertext))
        {
            return ciphertext;
        }

        try
        {
            return protector.Unprotect(ciphertext);
        }
        catch (Exception)
        {
            // Şifreleme devreye girmeden önce yazılmış düz metin değer — olduğu gibi döndür.
            return ciphertext;
        }
    }
}
