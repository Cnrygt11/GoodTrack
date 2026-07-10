using System;
using System.Net;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace GoodTrack.API.DTOs.Etsy;

/// <summary>
/// Etsy Open API v3, metin alanlarını HTML-encoded olarak döndürür
/// (ör. <c>Buyer&amp;#39;s Note</c>, <c>26&amp;quot;</c>). Bu converter, deserialize
/// sırasında tüm string değerleri bir kez decode eder; böylece varyasyon adları,
/// kişiselleştirme notları, ürün başlıkları ve müşteri adı/adresi panelde
/// düzgün görünür.
///
/// Tek tek kullanım yerlerinde decode etmek yerine burada merkezîleştirilmiştir:
/// Etsy'den gelen her string bu noktadan geçer.
/// </summary>
public sealed class HtmlDecodingStringConverter : JsonConverter<string?>
{
    public override string? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.Null)
        {
            return null;
        }

        var value = reader.GetString();
        return value is null ? null : WebUtility.HtmlDecode(value);
    }

    public override void Write(Utf8JsonWriter writer, string? value, JsonSerializerOptions options)
    {
        // Yazarken kodlama yapmıyoruz; değerler zaten decode edilmiş halde tutulur.
        writer.WriteStringValue(value);
    }
}
