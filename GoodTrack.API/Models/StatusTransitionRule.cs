using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace GoodTrack.API.Models;

public class StatusTransitionRule
{
    public string RequiredRole { get; set; } = string.Empty;
    public HashSet<string> AllowedSourceStatuses { get; set; } = new(StringComparer.OrdinalIgnoreCase);
    public string ErrorMessage { get; set; } = string.Empty;
    public Func<Product, string, string?, string?, Task<string>> TransitionAction { get; set; } = null!;
}
