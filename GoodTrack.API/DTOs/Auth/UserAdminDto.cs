using System.Collections.Generic;

namespace GoodTrack.API.DTOs.Auth;

public class UserAdminDto
{
    public string Id { get; set; } = string.Empty;

    public string Username { get; set; } = string.Empty;

    public string Role { get; set; } = string.Empty;

    public string FirstName { get; set; } = string.Empty;

    public string LastName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string PhoneNumber { get; set; } = string.Empty;

    public string ProfilePicture { get; set; } = string.Empty;

    public string Address { get; set; } = string.Empty;

    public string City { get; set; } = string.Empty;

    public string Bio { get; set; } = string.Empty;

    public List<string> ProductImages { get; set; } = new();

    public List<string> Keywords { get; set; } = new();

    public bool IsVisibleToSellers { get; set; }

    public string CreatedAt { get; set; } = string.Empty;

    public List<string> AssociatedUserIds { get; set; } = new();

    public bool IsActive { get; set; }
}
