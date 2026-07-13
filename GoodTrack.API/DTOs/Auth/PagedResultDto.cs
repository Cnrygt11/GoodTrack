using System.Collections.Generic;

namespace GoodTrack.API.DTOs.Auth;

public class PagedResultDto<T>
{
    public List<T> Items { get; set; } = new();

    /// <summary>Keyset (cursor) sayfalama için — dizin artık offset kullandığından null döner.</summary>
    public string? NextCursor { get; set; }

    /// <summary>Filtreye uyan toplam kayıt sayısı (offset sayfalama için).</summary>
    public int? TotalCount { get; set; }

    /// <summary>Daha fazla sayfa var mı (offset sayfalama için).</summary>
    public bool HasMore { get; set; }
}
