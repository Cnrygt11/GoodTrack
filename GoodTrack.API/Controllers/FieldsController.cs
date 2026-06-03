using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using System.Threading.Tasks;
using System.Collections.Generic;
using System;
using Microsoft.Extensions.Logging;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.Models;

namespace GoodTrack.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "seller")]
public class FieldsController : ControllerBase
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
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        _logger.LogInformation("Seller user {UserId} is retrieving extra dynamic fields templates", userId);
        var fields = await _fieldService.GetSellerFieldsAsync(userId);
        return Ok(fields);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] ExtraFieldDef field)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        _logger.LogInformation("Seller user {UserId} is creating a new dynamic feature template: {Name}", userId, field.Name);
        var created = await _fieldService.CreateFieldDefAsync(userId, field);
        return Ok(new { field = created, message = "Yeni özellik başarıyla eklendi." });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        _logger.LogInformation("Seller user {UserId} is deleting dynamic feature template: {Id}", userId, id);
        await _fieldService.DeleteFieldDefAsync(userId, id);
        return Ok(new { id, message = "Özellik başarıyla silindi." });
    }
}
