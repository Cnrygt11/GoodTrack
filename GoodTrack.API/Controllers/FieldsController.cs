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
public class FieldsController : BaseApiController
{
    private readonly IFieldService _fieldService;
    private readonly ILogger<FieldsController> _logger;

    public FieldsController(IFieldService fieldService, ILogger<FieldsController> logger)
    {
        _fieldService = fieldService;
        _logger = logger;
    }

    /// <summary>
    /// Retrieves all dynamic field definitions.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<ExtraFieldDefResponseDto>>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetAll()
    {
        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return Unauthorized(ApiResponse.Fail("Yetkisiz erişim."));
        }

        _logger.LogInformation("Seller user {UserId} is retrieving extra dynamic fields templates", userId);
        var response = await _fieldService.GetSellerFieldsAsync(userId);
        return Ok(new ApiResponse<List<ExtraFieldDefResponseDto>>(response));
    }

    /// <summary>
    /// Creates a new dynamic field definition.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<ExtraFieldDefResponseDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Create([FromBody] CreateExtraFieldDefDto dto)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return Unauthorized(ApiResponse.Fail("Yetkisiz erişim."));
        }

        _logger.LogInformation("Seller user {UserId} is creating a new dynamic feature template: {Name}", userId, dto.Name);
        var response = await _fieldService.CreateFieldDefAsync(userId, dto);
        return Created(string.Empty, new ApiResponse<ExtraFieldDefResponseDto>(response, "Yeni özellik başarıyla eklendi."));
    }

    /// <summary>
    /// Deletes a dynamic field definition.
    /// </summary>
    [HttpDelete("{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
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
            return BadRequest(ApiResponse.Fail("Geçersiz özellik ID'si."));
        }

        _logger.LogInformation("Seller user {UserId} is deleting dynamic feature template: {Id}", userId, id);
        await _fieldService.DeleteFieldDefAsync(userId, id);
        return NoContent();
    }
}
