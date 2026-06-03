using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using System.Threading.Tasks;
using System.Collections.Generic;
using System;
using Microsoft.Extensions.Logging;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.Models;
using GoodTrack.API.DTOs.Product;

namespace GoodTrack.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProductsController : ControllerBase
{
    private readonly IProductService _productService;
    private readonly ILogger<ProductsController> _logger;

    public ProductsController(IProductService productService, ILogger<ProductsController> logger)
    {
        _productService = productService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var role = User.FindFirst(ClaimTypes.Role)?.Value;

        if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(role))
        {
            return Unauthorized(new { message = "Kullanıcı kimliği bulunamadı." });
        }

        _logger.LogInformation("Retrieving products list for User: {UserId} with Role: {Role}", userId, role);
        var products = await _productService.GetUserProductsAsync(userId, role);
        return Ok(products);
    }

    [HttpPost]
    [Authorize(Roles = "seller")]
    public async Task<IActionResult> Create([FromBody] Product product)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var userName = User.FindFirst(ClaimTypes.Name)?.Value ?? "Satıcı";

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        _logger.LogInformation("Seller user {UserId} is submitting a new production order: {Code}", userId, product.Code);
        var created = await _productService.CreateOrderAsync(userId, userName, product);
        return Ok(new { product = created, message = "Sipariş başarıyla üretime gönderildi." });
    }

    [HttpPut("{id}/complete")]
    [Authorize(Roles = "mfr")]
    public async Task<IActionResult> ToggleComplete(string id, [FromBody] ToggleCompleteRequest request)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        _logger.LogInformation("Manufacturer user {UserId} is toggling completion for order {Id} to: {Completed}", userId, id, request.Completed);
        await _productService.ToggleOrderCompletionAsync(userId, id, request.Completed);
        return Ok(new { id, completed = request.Completed, message = "Sipariş durumu başarıyla güncellendi." });
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "seller")]
    public async Task<IActionResult> Update(string id, [FromBody] Product product)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        try
        {
            _logger.LogInformation("Seller user {UserId} is updating production order: {Id}", userId, id);
            var updated = await _productService.UpdateProductAsync(userId, id, product);
            return Ok(new { product = updated, message = "Sipariş başarıyla güncellendi." });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "seller")]
    public async Task<IActionResult> Delete(string id)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        try
        {
            _logger.LogInformation("Seller user {UserId} is deleting production order: {Id}", userId, id);
            await _productService.DeleteProductAsync(userId, id);
            return Ok(new { message = "Sipariş başarıyla silindi." });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
    }
}
