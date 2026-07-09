using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Moq;
using Xunit;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.DTOs.Product;
using GoodTrack.API.Models;
using GoodTrack.API.Services;

namespace GoodTrack.API.Tests;

public class FieldServiceTests
{
    private readonly Mock<IFieldRepository> _fieldRepositoryMock = new();
    private readonly FieldService _service;

    public FieldServiceTests()
    {
        _service = new FieldService(_fieldRepositoryMock.Object);
    }

    [Theory]
    [InlineData(null, "text")]
    [InlineData("Renk", null)]
    [InlineData("", "text")]
    public async Task CreateFieldDef_InvalidData_Throws(string? name, string? type)
    {
        var dto = new CreateExtraFieldDefDto { Name = name!, Type = type! };

        var act = () => _service.CreateFieldDefAsync("seller-1", dto);
        await act.Should().ThrowAsync<ArgumentException>();

        _fieldRepositoryMock.Verify(r => r.SaveAsync(It.IsAny<ExtraFieldDef>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CreateFieldDef_Valid_SavesWithSellerAsCreator()
    {
        ExtraFieldDef? saved = null;
        _fieldRepositoryMock
            .Setup(r => r.SaveAsync(It.IsAny<ExtraFieldDef>(), It.IsAny<CancellationToken>()))
            .Callback<ExtraFieldDef, CancellationToken>((f, _) => saved = f)
            .Returns(Task.CompletedTask);

        var dto = new CreateExtraFieldDefDto { Name = "Renk", Type = "text", Options = new List<string> { "Kırmızı" } };
        var result = await _service.CreateFieldDefAsync("seller-1", dto);

        saved.Should().NotBeNull();
        saved!.Name.Should().Be("Renk");
        saved.CreatedBy.Should().Be("seller-1");
        result.Name.Should().Be("Renk");
    }

    [Fact]
    public async Task DeleteFieldDef_NotFound_ThrowsKeyNotFound()
    {
        _fieldRepositoryMock
            .Setup(r => r.GetByIdAsync("missing", It.IsAny<CancellationToken>()))
            .ReturnsAsync((ExtraFieldDef?)null);

        var act = () => _service.DeleteFieldDefAsync("seller-1", "missing");
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task DeleteFieldDef_NotOwner_ThrowsUnauthorized()
    {
        _fieldRepositoryMock
            .Setup(r => r.GetByIdAsync("f1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ExtraFieldDef { Id = "f1", CreatedBy = "someone-else" });

        var act = () => _service.DeleteFieldDefAsync("seller-1", "f1");
        await act.Should().ThrowAsync<UnauthorizedAccessException>();

        _fieldRepositoryMock.Verify(r => r.DeleteAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task DeleteFieldDef_Owner_Deletes()
    {
        _fieldRepositoryMock
            .Setup(r => r.GetByIdAsync("f1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ExtraFieldDef { Id = "f1", CreatedBy = "seller-1" });

        await _service.DeleteFieldDefAsync("seller-1", "f1");

        _fieldRepositoryMock.Verify(r => r.DeleteAsync("f1", It.IsAny<CancellationToken>()), Times.Once);
    }
}
