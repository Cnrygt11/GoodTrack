using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace GoodTrack.API.DTOs.Product;

public class CreateExtraFieldDefDto
{
    [Required(ErrorMessage = "Özellik adı zorunludur.")]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required(ErrorMessage = "Özellik tipi zorunludur.")]
    [MaxLength(50)]
    public string Type { get; set; } = string.Empty;

    public List<string> Options { get; set; } = new();
}
