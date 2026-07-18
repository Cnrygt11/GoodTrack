using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Http;
using System.Threading.Tasks;
using System.Collections.Generic;
using Microsoft.Extensions.Logging;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.Constants;
using GoodTrack.API.DTOs.Product;
using GoodTrack.API.DTOs.Common;

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

    /// <summary>
    /// Retrieves the seller's product catalog.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<CatalogProductResponseDto>>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetCatalog()
    {
        if (!TryGetCurrentUserId(out var userId, out var authError)) return authError;

        _logger.LogInformation("Fetching catalog products for Seller user: {UserId}", userId);
        var response = await _catalogService.GetSellerCatalogAsync(userId);
        return Ok(new ApiResponse<List<CatalogProductResponseDto>>(response));
    }

    /// <summary>
    /// Tek katalog ürününü TAM görseliyle döner. Liste ucu (GET /) ağır base64 görseli
    /// taşımaz; detay/düzenleme/lightbox akışları tam görseli buradan çeker.
    /// </summary>
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(ApiResponse<CatalogProductResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetCatalogProduct(string id)
    {
        if (!TryGetCurrentUserId(out var userId, out var authError)) return authError;

        if (string.IsNullOrWhiteSpace(id))
        {
            return BadRequest(ApiResponse.Fail(Messages.Catalog.InvalidId));
        }

        // KeyNotFoundException → 404 eşlemesini ExceptionHandlingMiddleware yapar.
        var response = await _catalogService.GetCatalogProductAsync(userId, id);
        return Ok(new ApiResponse<CatalogProductResponseDto>(response));
    }

    /// <summary>
    /// Adds a new product to the catalog.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<CatalogProductResponseDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> AddCatalogProduct([FromBody] CreateCatalogProductDto dto)
    {
        if (!TryGetCurrentUserId(out var userId, out var authError)) return authError;

        _logger.LogInformation("Seller user {UserId} is adding catalog product: {Code}", userId, dto.ProductCode);
        var response = await _catalogService.AddCatalogProductAsync(userId, dto);

        return Created(string.Empty, new ApiResponse<CatalogProductResponseDto>(response, "Ürün başarıyla kataloğa eklendi."));
    }

    /// <summary>
    /// Updates a catalog product.
    /// </summary>
    [HttpPut("{id}")]
    [ProducesResponseType(typeof(ApiResponse<CatalogProductResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> UpdateCatalogProduct(string id, [FromBody] CreateCatalogProductDto dto)
    {
        if (!TryGetCurrentUserId(out var userId, out var authError)) return authError;

        if (string.IsNullOrWhiteSpace(id))
        {
            return BadRequest(ApiResponse.Fail(Messages.Catalog.InvalidId));
        }

        _logger.LogInformation("Seller user {UserId} is updating catalog product: {Id}", userId, id);
        var response = await _catalogService.UpdateCatalogProductAsync(userId, id, dto);

        return Ok(new ApiResponse<CatalogProductResponseDto>(response, "Ürün kataloğu başarıyla güncellendi."));
    }

    /// <summary>
    /// Deletes a catalog product.
    /// </summary>
    [HttpDelete("{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> DeleteCatalogProduct(string id)
    {
        if (!TryGetCurrentUserId(out var userId, out var authError)) return authError;

        if (string.IsNullOrWhiteSpace(id))
        {
            return BadRequest(ApiResponse.Fail(Messages.Catalog.InvalidId));
        }

        _logger.LogInformation("Seller user {UserId} is deleting catalog product: {Id}", userId, id);
        await _catalogService.DeleteCatalogProductAsync(userId, id);
        return NoContent();
    }
}
