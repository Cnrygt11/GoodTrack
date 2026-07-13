using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Models;
using GoodTrack.API.Constants;
using GoodTrack.API.DTOs.Auth;

namespace GoodTrack.API.Infrastructure.Repositories;

public sealed class PostgresUserRepository : IUserRepository
{
    private readonly AppDbContext _context;

    public PostgresUserRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<User?> GetByIdAsync(string id, CancellationToken cancellationToken = default)
    {
        return await _context.Users.FindAsync(new object?[] { id }, cancellationToken);
    }

    public async Task<List<User>> GetByIdsAsync(IEnumerable<string> ids, CancellationToken cancellationToken = default)
    {
        var idList = ids?.Where(id => !string.IsNullOrWhiteSpace(id)).Distinct().ToList() ?? new List<string>();
        if (idList.Count == 0)
        {
            return new List<User>();
        }

        return await _context.Users
            .AsNoTracking()
            .Where(u => idList.Contains(u.Id))
            .ToListAsync(cancellationToken);
    }

    public async Task<User?> GetByUsernameAsync(string username, CancellationToken cancellationToken = default)
    {
        return await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Username == username, cancellationToken);
    }

    public async Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default)
    {
        return await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email == email, cancellationToken);
    }

    public async Task<List<UserDto>> GetManufacturerSummariesAsync(CancellationToken cancellationToken = default)
    {
        // Projeksiyon: yalnız Id/Username/Role seçilir; base64 ProfilePicture/ProductImages sütunları
        // DB'den hiç okunmaz.
        return await _context.Users
            .AsNoTracking()
            .Where(u => u.Role == Roles.Mfr && u.IsVisibleToSellers && u.DeactivatedAt == null)
            .Select(u => new UserDto { Id = u.Id, Username = u.Username, Role = u.Role })
            .ToListAsync(cancellationToken);
    }

    public async Task<(List<UserProfileDto> Items, int TotalCount)> SearchManufacturersAsync(
        string? city,
        string? keyword,
        string? name,
        string? sort,
        int page,
        int pageSize,
        bool mustHaveGallery = false,
        bool mustHaveAvatar = false,
        CancellationToken cancellationToken = default)
    {
        var query = _context.Users
            .AsNoTracking()
            .Where(u => u.Role == Roles.Mfr && u.IsVisibleToSellers && u.DeactivatedAt == null);

        if (!string.IsNullOrWhiteSpace(city))
        {
            var cities = city.Split(',', StringSplitOptions.RemoveEmptyEntries).Select(c => c.Trim().ToLower()).ToList();
            if (cities.Any())
            {
                // Filtre şehirleri lowercase; karşılaştırmada u.City de lowercase'e çevrilir ki kayıt
                // kasadan bağımsız eşleşsin ("İstanbul" ↔ "istanbul"). EF bunu SQL lower()'a çevirir.
                query = query.Where(u => cities.Contains(u.City.ToLower()));
            }
        }

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var keywords = keyword.Split(',', StringSplitOptions.RemoveEmptyEntries).Select(k => k.Trim().ToLower()).ToList();
            if (keywords.Any())
            {
                query = query.Where(u => u.Keywords.Any(kw => keywords.Contains(kw)));
            }
        }

        if (!string.IsNullOrWhiteSpace(name))
        {
            // İsim/kullanıcı-adı araması: kasa-duyarsız kısmi eşleşme. .ToLower().Contains her iki
            // sağlayıcıda da çevrilir (Postgres lower()+position, SQLite lower()+instr).
            var term = name.Trim().ToLower();
            query = query.Where(u =>
                (u.FirstName + " " + u.LastName).ToLower().Contains(term) ||
                u.Username.ToLower().Contains(term));
        }

        if (mustHaveGallery)
        {
            query = query.Where(u => u.ProductImages != null && u.ProductImages.Count > 0);
        }

        if (mustHaveAvatar)
        {
            query = query.Where(u => !string.IsNullOrEmpty(u.ProfilePicture));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        // Sıralama: varsayılan "completeness" (galerisi + avatarı olanlar önce), "name" (A–Z), "city".
        query = sort switch
        {
            "name" => query.OrderBy(u => u.FirstName).ThenBy(u => u.LastName).ThenBy(u => u.Id),
            "city" => query.OrderBy(u => u.City).ThenBy(u => u.Id),
            _ => query
                .OrderByDescending(u => u.ProductImages.Count > 0)
                .ThenByDescending(u => u.ProfilePicture != string.Empty || u.ProfileThumbnail != string.Empty)
                .ThenBy(u => u.Id),
        };

        // Projeksiyon: ağır ProductImages galerisi SEÇİLMEZ (yalnız .Count = cardinality hesaplanır),
        // böylece base64 dizi DB'den okunmaz. Avatar thumbnail'e düşer.
        var items = await query
            .Skip(page * pageSize)
            .Take(pageSize)
            .Select(u => new UserProfileDto
            {
                Id = u.Id,
                Username = u.Username,
                Email = u.Email,
                PhoneNumber = u.PhoneNumber,
                FirstName = u.FirstName,
                LastName = u.LastName,
                Role = u.Role,
                // Dizin listesi tam avatarı ayrı taşımaz; thumbnail varsa onu, yoksa (eski kayıt) tam
                // avatara düşerek taşır. Yeni kayıtlar küçük thumbnail gönderdiğinden yük progresif azalır.
                ProfileThumbnail = u.ProfileThumbnail != string.Empty ? u.ProfileThumbnail : u.ProfilePicture,
                Address = u.Address,
                City = u.City,
                Bio = u.Bio,
                Keywords = u.Keywords,
                IsVisibleToSellers = u.IsVisibleToSellers,
                GalleryCount = u.ProductImages.Count,
            })
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    public async Task SaveAsync(User user, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(user.Id))
        {
            user.Id = Guid.NewGuid().ToString();
            await _context.Users.AddAsync(user, cancellationToken);
        }
        else
        {
            _context.Users.Update(user);
        }

        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<List<User>> GetAllUsersAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Users
            .AsNoTracking()
            .ToListAsync(cancellationToken);
    }

    public async Task DeleteUserAsync(string id, CancellationToken cancellationToken = default)
    {
        var user = await _context.Users.FindAsync(new object?[] { id }, cancellationToken);
        if (user == null)
        {
            return;
        }

        // Kullanıcı fiziksel silindiğinde, User'a FK cascade'i OLMAYAN ilişkili kayıtları
        // uygulama seviyesinde temizle (orphan bırakma). Kullanıcı hem satıcı hem üretici
        // olabileceğinden her iki alan da kontrol edilir. EtsyConnection / EtsyOAuthState /
        // UserCredit zaten FK cascade ile silinir.
        var products = await _context.Products
            .Where(p => p.SellerId == id || p.ManufacturerId == id)
            .ToListAsync(cancellationToken);
        _context.Products.RemoveRange(products);

        var catalog = await _context.CatalogProducts
            .Where(c => c.SellerId == id || c.ManufacturerId == id)
            .ToListAsync(cancellationToken);
        _context.CatalogProducts.RemoveRange(catalog);

        var connections = await _context.UserConnections
            .Where(uc => uc.SellerId == id || uc.ManufacturerId == id)
            .ToListAsync(cancellationToken);
        _context.UserConnections.RemoveRange(connections);

        _context.Users.Remove(user);
        await _context.SaveChangesAsync(cancellationToken); // tek transaction (atomik)
    }
}
