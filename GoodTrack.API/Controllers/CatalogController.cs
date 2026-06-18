using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using System.Security.Claims;
using System.Threading.Tasks;
using System.Collections.Generic;
using System;
using Microsoft.Extensions.Logging;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.Models;
using GoodTrack.API.Constants;

namespace GoodTrack.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = Roles.Seller)]
[EnableRateLimiting("api-general")]
public class CatalogController : ControllerBase
{
    private readonly ICatalogService _catalogService;
    private readonly ILogger<CatalogController> _logger;

    public CatalogController(ICatalogService catalogService, ILogger<CatalogController> logger)
    {
        _catalogService = catalogService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetCatalog()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        _logger.LogInformation("Fetching catalog products for Seller user: {UserId}", userId);
        var catalog = await _catalogService.GetSellerCatalogAsync(userId);
        return Ok(catalog);
    }

    [HttpPost]
    public async Task<IActionResult> AddCatalogProduct([FromBody] CatalogProduct product)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        _logger.LogInformation("Seller user {UserId} is adding catalog product: {Code}", userId, product.ProductCode);
        var created = await _catalogService.AddCatalogProductAsync(userId, product);
        return Ok(new { product = created, message = "Ürün başarıyla kataloğa eklendi." });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateCatalogProduct(string id, [FromBody] CatalogProduct product)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        _logger.LogInformation("Seller user {UserId} is updating catalog product: {Id}", userId, id);
        var updated = await _catalogService.UpdateCatalogProductAsync(userId, id, product);
        return Ok(new { product = updated, message = "Katalog ürünü başarıyla güncellendi." });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteCatalogProduct(string id)

    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        _logger.LogInformation("Seller user {UserId} is deleting catalog product: {Id}", userId, id);
        await _catalogService.DeleteCatalogProductAsync(userId, id);
        return Ok(new { message = "Katalog ürünü başarıyla silindi." });
    }
}
