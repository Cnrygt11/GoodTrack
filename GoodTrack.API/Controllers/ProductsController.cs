using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;
using System;
using Microsoft.Extensions.Logging;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.DTOs.Product;
using GoodTrack.API.Constants;

namespace GoodTrack.API.Controllers;

[Authorize]
[EnableRateLimiting("api-general")]
public class ProductsController : BaseApiController
{
    private readonly IProductService _productService;
    private readonly IOrderWorkflowService _orderWorkflowService;
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

    public ProductsController(
        IProductService productService, 
        IOrderWorkflowService orderWorkflowService,
        ILogger<ProductsController> logger)
    {
        _productService = productService;
        _orderWorkflowService = orderWorkflowService;
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
        var response = await _productService.GetUserProductsAsync(userId, role, cancellationToken);
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

        _logger.LogInformation("Seller user {UserId} is submitting a new production order: {Code}", userId, dto.Code);
        var response = await _productService.CreateOrderAsync(userId, userName, dto);

        return CreatedAtAction(nameof(GetById), new { id = response.Id }, new { product = response, message = "Sipariş başarıyla üretime gönderildi." });
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

        if (!ValidStatuses.Contains(request.Status.Trim()))
        {
            return BadRequest(new { message = $"Geçersiz durum bilgisi: {request.Status}" });
        }

        _logger.LogInformation("User {UserId} with role {Role} is changing status of order {Id} to: {Status}", userId, role, id, request.Status);

        await _orderWorkflowService.UpdateOrderStatusAsync(userId, role, id, request.Status, request.DefectNote, request.DefectImage);
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

        _logger.LogInformation("Seller user {UserId} is updating production order: {Id}", userId, id);
        var response = await _productService.UpdateProductAsync(userId, id, dto);

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
        var response = await _productService.GetProductByIdAsync(userId, role, id, cancellationToken);
        if (response == null)
        {
            return NotFound(new { message = "Sipariş bulunamadı veya erişim yetkiniz yok." });
        }

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

    [HttpPost("read-status")]
    public async Task<IActionResult> MarkStatusAsRead([FromBody] MarkStatusReadRequest request)
    {
        var userId = GetCurrentUserId();
        var role = User.FindFirst(ClaimTypes.Role)?.Value;

        if (userId is null || string.IsNullOrEmpty(role))
        {
            return Unauthorized(new { message = "Kullanıcı kimliği bulunamadı." });
        }

        if (request == null || string.IsNullOrWhiteSpace(request.Status))
        {
            return BadRequest(new { message = "Geçersiz istek veya eksik durum (status) alanı." });
        }

        _logger.LogInformation("Marking status {Status} as read for User: {UserId} with Role: {Role}", request.Status, userId, role);
        await _productService.MarkStatusAsReadAsync(userId, role, request.Status);
        return Ok(new { message = "Siparişler başarıyla okundu olarak işaretlendi." });
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
        await _orderWorkflowService.RequestOrderCancellationAsync(userId, id);
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
        await _orderWorkflowService.RespondToOrderCancellationAsync(userId, id, request.Approve);
        string msg = request.Approve ? "İptal talebi onaylandı, sipariş iptal edildi." : "İptal talebi reddedildi, üretime devam ediliyor.";
        return Ok(new { message = msg });
    }
}
