using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Http;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;
using System;
using Microsoft.Extensions.Logging;
using MediatR;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.DTOs.Product;
using GoodTrack.API.Constants;
using GoodTrack.API.DTOs.Common;
using GoodTrack.API.Features.Products;
using GoodTrack.API.Features.Products.CreateOrder;
using GoodTrack.API.Features.Products.UpdateOrderStatus;
using GoodTrack.API.Features.Products.DeleteProduct;

namespace GoodTrack.API.Controllers;

[Authorize]
[EnableRateLimiting("api-general")]
public class ProductsController : BaseApiController
{
    private readonly IMediator _mediator;
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
        IMediator mediator,
        IProductService productService, 
        IOrderWorkflowService orderWorkflowService,
        ILogger<ProductsController> logger)
    {
        _mediator = mediator;
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
            return Unauthorized(ApiResponse.Fail("Kullanıcı kimliği bulunamadı."));
        }

        var query = new GetProductsForUserQuery(userId, role);
        var result = await _mediator.Send(query, cancellationToken);
        return Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = Roles.Seller)]
    public async Task<IActionResult> Create([FromBody] CreateProductDto dto)
    {
        var userId = GetCurrentUserId();
        var userName = User.FindFirst(ClaimTypes.Name)?.Value ?? "Satıcı";

        if (userId is null)
        {
            return Unauthorized(ApiResponse.Fail("Yetkisiz erişim."));
        }

        if (dto == null)
        {
            return BadRequest(ApiResponse.Fail("İstek verisi eksik."));
        }

        var command = new CreateOrderCommand(userId, userName, dto);
        var result = await _mediator.Send(command);

        if (result.Data is null)
        {
            return BadRequest(ApiResponse.Fail("Sipariş oluşturulamadı."));
        }

        return CreatedAtAction(nameof(GetById), new { id = result.Data.Id }, new ApiResponse<object>(new { product = result.Data, message = "Sipariş başarıyla üretime gönderildi." }));
    }

    [HttpPut("{id}/status")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> UpdateStatus(string id, [FromBody] UpdateStatusRequest request)
    {
        var userId = GetCurrentUserId();
        var role = User.FindFirst(ClaimTypes.Role)?.Value;

        if (userId is null || string.IsNullOrEmpty(role))
        {
            return Unauthorized(ApiResponse.Fail("Yetkisiz erişim."));
        }

        if (request == null || string.IsNullOrWhiteSpace(request.Status))
        {
            return BadRequest(ApiResponse.Fail("Hedef durum bilgisi eksik."));
        }

        if (!ValidStatuses.Contains(request.Status.Trim()))
        {
            return BadRequest(ApiResponse.Fail($"Geçersiz durum bilgisi: {request.Status}"));
        }

        var command = new UpdateOrderStatusCommand(userId, role, id, request.Status, request.DefectNote, request.DefectImage);
        var result = await _mediator.Send(command);
        return Ok(result);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = Roles.Seller)]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateProductDto dto, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return Unauthorized(ApiResponse.Fail("Yetkisiz erişim."));
        }

        if (dto == null)
        {
            return BadRequest(ApiResponse.Fail("İstek verisi eksik."));
        }

        if (string.IsNullOrWhiteSpace(id))
        {
            return BadRequest(ApiResponse.Fail("Geçersiz sipariş ID'si."));
        }

        _logger.LogInformation("Seller user {UserId} is updating production order: {Id}", userId, id);
        var response = await _productService.UpdateProductAsync(userId, id, dto, cancellationToken);

        return Ok(new ApiResponse<object>(new { product = response, message = "Sipariş başarıyla güncellendi." }));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        var role = User.FindFirst(ClaimTypes.Role)?.Value;

        if (userId is null || string.IsNullOrEmpty(role))
        {
            return Unauthorized(ApiResponse.Fail("Yetkisiz erişim."));
        }

        if (string.IsNullOrWhiteSpace(id))
        {
            return BadRequest(ApiResponse.Fail("Geçersiz sipariş ID'si."));
        }

        _logger.LogInformation("User {UserId} is retrieving single production order details: {Id}", userId, id);
        var response = await _productService.GetProductByIdAsync(userId, role, id, cancellationToken);
        if (response == null)
        {
            return NotFound(ApiResponse.Fail("Sipariş bulunamadı veya erişim yetkiniz yok."));
        }

        return Ok(new ApiResponse<ProductResponseDto>(response));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = Roles.Seller)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Delete(string id)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return Unauthorized(ApiResponse.Fail("Yetkisiz erişim."));
        }

        if (string.IsNullOrWhiteSpace(id))
        {
            return BadRequest(ApiResponse.Fail("Geçersiz sipariş ID'si."));
        }

        var command = new DeleteProductCommand(userId, id);
        var result = await _mediator.Send(command);
        return Ok(result);
    }

    [HttpPost("read-status")]
    public async Task<IActionResult> MarkStatusAsRead([FromBody] MarkStatusReadRequest request)
    {
        var userId = GetCurrentUserId();
        var role = User.FindFirst(ClaimTypes.Role)?.Value;

        if (userId is null || string.IsNullOrEmpty(role))
        {
            return Unauthorized(ApiResponse.Fail("Kullanıcı kimliği bulunamadı."));
        }

        if (request == null || string.IsNullOrWhiteSpace(request.Status))
        {
            return BadRequest(ApiResponse.Fail("Geçersiz istek veya eksik durum (status) alanı."));
        }

        _logger.LogInformation("Marking status {Status} as read for User: {UserId} with Role: {Role}", request.Status, userId, role);
        await _productService.MarkStatusAsReadAsync(userId, role, request.Status);
        return Ok(ApiResponse.Ok("Siparişler başarıyla okundu olarak işaretlendi."));
    }

    [HttpPost("{id}/cancellation-requests")]
    [Authorize(Roles = Roles.Seller)]
    public async Task<IActionResult> RequestCancellation(string id)
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized(ApiResponse.Fail("Yetkisiz erişim."));

        if (string.IsNullOrWhiteSpace(id))
        {
            return BadRequest(ApiResponse.Fail("Geçersiz sipariş ID'si."));
        }

        _logger.LogInformation("Seller {UserId} requesting cancellation for order {Id}", userId, id);
        await _orderWorkflowService.RequestOrderCancellationAsync(userId, id);
        return Ok(ApiResponse.Ok("İptal talebi üreticiye iletildi."));
    }

    [HttpPatch("{id}/cancellation-requests")]
    [Authorize(Roles = Roles.Mfr)]
    public async Task<IActionResult> RespondToCancellation(string id, [FromBody] RespondToCancellationRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized(ApiResponse.Fail("Yetkisiz erişim."));

        if (string.IsNullOrWhiteSpace(id))
        {
            return BadRequest(ApiResponse.Fail("Geçersiz sipariş ID'si."));
        }

        if (request == null)
        {
            return BadRequest(ApiResponse.Fail("İstek verisi eksik."));
        }

        _logger.LogInformation("Manufacturer {UserId} responding to cancellation for order {Id} with: {Approve}", userId, id, request.Approve);
        await _orderWorkflowService.RespondToOrderCancellationAsync(userId, id, request.Approve);
        string msg = request.Approve ? "İptal talebi onaylandı, sipariş iptal edildi." : "İptal talebi reddedildi, üretime devam ediliyor.";
        return Ok(ApiResponse.Ok(msg));
    }
}
