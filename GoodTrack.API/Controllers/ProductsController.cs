using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;
using System;
using System.Linq;
using Microsoft.Extensions.Logging;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.Models;
using GoodTrack.API.DTOs.Product;
using GoodTrack.API.Constants;

namespace GoodTrack.API.Controllers;

[Authorize]
[EnableRateLimiting("api-general")]
public class ProductsController : BaseApiController
{
    private readonly IProductService _productService;
    private readonly ILogger<ProductsController> _logger;

    private static readonly HashSet<string> ValidStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        OrderStatus.Awaiting,
        OrderStatus.Production,
        OrderStatus.Completed,
        OrderStatus.Delivered,
        OrderStatus.Broken,
        OrderStatus.Corrected,
        OrderStatus.Defective,
        OrderStatus.Missing,
        OrderStatus.ToShip,
        OrderStatus.Shipped,
        OrderStatus.Cancelled
    };

    public ProductsController(IProductService productService, ILogger<ProductsController> logger)
    {
        _productService = productService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        var role = User.FindFirst(ClaimTypes.Role)?.Value;

        if (userId is null || string.IsNullOrEmpty(role))
        {
            return Unauthorized(new { message = "Kullanıcı kimliği bulunamadı." });
        }

        _logger.LogInformation("Retrieving products list for User: {UserId} with Role: {Role}", userId, role);
        var products = await _productService.GetUserProductsAsync(userId, role, cancellationToken);
        var response = products.Select(MapToResponseDto).ToList();
        return Ok(response);
    }

    [HttpPost]
    [Authorize(Roles = Roles.Seller)]
    public async Task<IActionResult> Create([FromBody] CreateProductDto dto)
    {
        var userId = GetCurrentUserId();
        var userName = User.FindFirst(ClaimTypes.Name)?.Value ?? "Satıcı";

        if (userId is null)
        {
            return Unauthorized();
        }

        if (dto == null)
        {
            return BadRequest(new { message = "İstek verisi eksik." });
        }

        var product = new Product
        {
            Code = dto.Code,
            Image = dto.Image,
            Text = dto.Text,
            Length = dto.Length,
            Extras = dto.Extras,
            ManufacturerId = dto.ManufacturerId,
            ManufacturerName = dto.ManufacturerName
        };

        _logger.LogInformation("Seller user {UserId} is submitting a new production order: {Code}", userId, product.Code);
        var created = await _productService.CreateOrderAsync(userId, userName, product);
        var response = MapToResponseDto(created);

        return CreatedAtAction(nameof(GetById), new { id = created.Id }, new { product = response, message = "Sipariş başarıyla üretime gönderildi." });
    }

    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateStatus(string id, [FromBody] UpdateStatusRequest request)
    {
        var userId = GetCurrentUserId();
        var role = User.FindFirst(ClaimTypes.Role)?.Value;

        if (userId is null || string.IsNullOrEmpty(role))
        {
            return Unauthorized();
        }

        if (request == null || string.IsNullOrWhiteSpace(request.Status))
        {
            return BadRequest(new { message = "Hedef durum bilgisi eksik." });
        }

        // Validate Status against OrderStatus constants
        if (!ValidStatuses.Contains(request.Status.Trim()))
        {
            return BadRequest(new { message = $"Geçersiz durum bilgisi: {request.Status}" });
        }

        _logger.LogInformation("User {UserId} with role {Role} is changing status of order {Id} to: {Status}", userId, role, id, request.Status);

        await _productService.UpdateOrderStatusAsync(userId, role, id, request.Status, request.DefectNote, request.DefectImage);
        return Ok(new { id, status = request.Status, message = "Sipariş durumu başarıyla güncellendi." });
    }

    [HttpPut("{id}")]
    [Authorize(Roles = Roles.Seller)]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateProductDto dto)
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
            return BadRequest(new { message = "Geçersiz sipariş ID'si." });
        }

        var product = new Product
        {
            Code = dto.Code,
            Image = dto.Image,
            Text = dto.Text,
            Length = dto.Length,
            Extras = dto.Extras,
            ManufacturerId = dto.ManufacturerId,
            ManufacturerName = dto.ManufacturerName
        };

        _logger.LogInformation("Seller user {UserId} is updating production order: {Id}", userId, id);
        var updated = await _productService.UpdateProductAsync(userId, id, product);
        var response = MapToResponseDto(updated);

        return Ok(new { product = response, message = "Sipariş başarıyla güncellendi." });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        var role = User.FindFirst(ClaimTypes.Role)?.Value;

        if (userId is null || string.IsNullOrEmpty(role))
        {
            return Unauthorized();
        }

        if (string.IsNullOrWhiteSpace(id))
        {
            return BadRequest(new { message = "Geçersiz sipariş ID'si." });
        }

        _logger.LogInformation("User {UserId} is retrieving single production order details: {Id}", userId, id);
        var product = await _productService.GetProductByIdAsync(userId, role, id, cancellationToken);
        if (product == null)
        {
            return NotFound(new { message = "Sipariş bulunamadı veya erişim yetkiniz yok." });
        }

        var response = MapToResponseDto(product);
        return Ok(response);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = Roles.Seller)]
    public async Task<IActionResult> Delete(string id)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        if (string.IsNullOrWhiteSpace(id))
        {
            return BadRequest(new { message = "Geçersiz sipariş ID'si." });
        }

        _logger.LogInformation("Seller user {UserId} is deleting production order: {Id}", userId, id);
        await _productService.DeleteProductAsync(userId, id);
        return NoContent();
    }

    [HttpPost("status-migrations")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> MigrateStatuses()
    {
        _logger.LogInformation("Admin triggered a status migration.");
        var count = await _productService.MigrateProductStatusesAsync();
        return Ok(new { message = $"{count} sipariş başarıyla güncellendi." });
    }

    [HttpPost("{id}/cancellation-requests")]
    [Authorize(Roles = Roles.Seller)]
    public async Task<IActionResult> RequestCancellation(string id)
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        if (string.IsNullOrWhiteSpace(id))
        {
            return BadRequest(new { message = "Geçersiz sipariş ID'si." });
        }

        _logger.LogInformation("Seller {UserId} requesting cancellation for order {Id}", userId, id);
        await _productService.RequestOrderCancellationAsync(userId, id);
        return Ok(new { message = "İptal talebi üreticiye iletildi." });
    }

    [HttpPatch("{id}/cancellation-requests")]
    [Authorize(Roles = Roles.Mfr)]
    public async Task<IActionResult> RespondToCancellation(string id, [FromBody] RespondToCancellationRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        if (string.IsNullOrWhiteSpace(id))
        {
            return BadRequest(new { message = "Geçersiz sipariş ID'si." });
        }

        if (request == null)
        {
            return BadRequest(new { message = "İstek verisi eksik." });
        }

        _logger.LogInformation("Manufacturer {UserId} responding to cancellation for order {Id} with: {Approve}", userId, id, request.Approve);
        await _productService.RespondToOrderCancellationAsync(userId, id, request.Approve);
        string msg = request.Approve ? "İptal talebi onaylandı, sipariş iptal edildi." : "İptal talebi reddedildi, üretime devam ediliyor.";
        return Ok(new { message = msg });
    }

    private ProductResponseDto MapToResponseDto(Product product)
    {
        return new ProductResponseDto
        {
            Id = product.Id,
            Code = product.Code,
            Image = product.Image,
            Text = product.Text,
            Length = product.Length,
            Extras = product.Extras,
            Completed = product.Completed,
            IsDefective = product.IsDefective,
            IsPendingApproval = product.IsPendingApproval,
            IsReproduction = product.IsReproduction,
            DefectNote = product.DefectNote,
            DefectImage = product.DefectImage,
            Status = product.Status,
            Logs = product.Logs,
            CreatedAt = product.CreatedAt,
            CompletedAt = product.CompletedAt,
            SellerId = product.SellerId,
            ManufacturerId = product.ManufacturerId,
            SellerName = product.SellerName,
            ManufacturerName = product.ManufacturerName,
            CancelRequested = product.CancelRequested
        };
    }
}
