using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.Constants;
using GoodTrack.API.DTOs.Product;

namespace GoodTrack.API.Controllers;

[Authorize(Roles = Roles.Seller)]
[EnableRateLimiting("api-general")]
public class CatalogController : BaseApiController
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
        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        _logger.LogInformation("Fetching catalog products for Seller user: {UserId}", userId);
        var response = await _catalogService.GetSellerCatalogAsync(userId);
        return Ok(response);
    }

    [HttpPost]
    public async Task<IActionResult> AddCatalogProduct([FromBody] CreateCatalogProductDto dto)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        if (dto == null)
        {
            return BadRequest(new { message = "İstek verisi eksik." });
        }

        _logger.LogInformation("Seller user {UserId} is adding catalog product: {Code}", userId, dto.ProductCode);
        var response = await _catalogService.AddCatalogProductAsync(userId, dto);
        
        return Created(string.Empty, new { product = response, message = "Ürün başarıyla kataloğa eklendi." });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateCatalogProduct(string id, [FromBody] CreateCatalogProductDto dto)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        if (dto == null)
        {
            return BadRequest(new { message = "İstek verisi eksik." });
        }

        if (string.IsNullOrWhiteSpace(id))
        {
            return BadRequest(new { message = "Geçersiz ürün ID'si." });
        }

        _logger.LogInformation("Seller user {UserId} is updating catalog product: {Id}", userId, id);
        var response = await _catalogService.UpdateCatalogProductAsync(userId, id, dto);
        
        return Ok(new { product = response, message = "Ürün kataloğu başarıyla güncellendi." });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteCatalogProduct(string id)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        if (string.IsNullOrWhiteSpace(id))
        {
            return BadRequest(new { message = "Geçersiz ürün ID'si." });
        }

        _logger.LogInformation("Seller user {UserId} is deleting catalog product: {Id}", userId, id);
        await _catalogService.DeleteCatalogProductAsync(userId, id);
        return NoContent();
    }
}
