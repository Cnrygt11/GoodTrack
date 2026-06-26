using System.ComponentModel.DataAnnotations;

namespace GoodTrack.API.Models;

public class ExtraFieldDef
{
    public string Id { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string Type { get; set; } = string.Empty;

    public List<string> Options { get; set; } = new();

    [MaxLength(50)]
    public string CreatedBy { get; set; } = string.Empty;
}
