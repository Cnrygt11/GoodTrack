using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using System.Threading.Tasks;
using System.Collections.Generic;
using Microsoft.Extensions.Logging;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.Constants;
using GoodTrack.API.DTOs.Product;

namespace GoodTrack.API.Controllers;

[Authorize(Roles = Roles.Seller)]
[EnableRateLimiting("api-general")]
public class FieldsController : BaseApiController
{
    private readonly IFieldService _fieldService;
    private readonly ILogger<FieldsController> _logger;

    public FieldsController(IFieldService fieldService, ILogger<FieldsController> logger)
    {
        _fieldService = fieldService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        _logger.LogInformation("Seller user {UserId} is retrieving extra dynamic fields templates", userId);
        var response = await _fieldService.GetSellerFieldsAsync(userId);
        return Ok(response);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateExtraFieldDefDto dto)
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

        _logger.LogInformation("Seller user {UserId} is creating a new dynamic feature template: {Name}", userId, dto.Name);
        var response = await _fieldService.CreateFieldDefAsync(userId, dto);
        return Created(string.Empty, new { field = response, message = "Yeni özellik başarıyla eklendi." });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        if (string.IsNullOrWhiteSpace(id))
        {
            return BadRequest(new { message = "Geçersiz özellik ID'si." });
        }

        _logger.LogInformation("Seller user {UserId} is deleting dynamic feature template: {Id}", userId, id);
        await _fieldService.DeleteFieldDefAsync(userId, id);
        return NoContent();
    }
}
