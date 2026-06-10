using System.Collections.Generic;

namespace GoodTrack.API.DTOs.Auth;

public class PagedResultDto<T>
{
    public List<T> Items { get; set; } = new();
    public string? NextCursor { get; set; }
}
