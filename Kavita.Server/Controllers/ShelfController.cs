using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Kavita.API.Database;
using Kavita.API.Services;
using Kavita.Models.DTOs;
using Kavita.Models.DTOs.Shelves;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Kavita.Server.Controllers;

/// <summary>
/// APIs for user Shelves — named groupings of books
/// </summary>
public class ShelfController(IUnitOfWork unitOfWork, IShelfService shelfService,
    ILogger<ShelfController> logger) : BaseApiController
{
    /// <summary>
    /// Get all shelves for the current user
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IList<AppUserShelfDto>>> GetShelves(CancellationToken ct)
    {
        return Ok(await unitOfWork.ShelfRepository.GetShelvesForUserAsync(UserId, ct));
    }

    /// <summary>
    /// Get shelves that contain a given series
    /// </summary>
    [HttpGet("series")]
    public async Task<ActionResult<IList<AppUserShelfDto>>> GetShelvesForSeries(int seriesId, CancellationToken ct)
    {
        return Ok(await unitOfWork.ShelfRepository.GetShelvesBySeriesAsync(UserId, seriesId, ct));
    }

    /// <summary>
    /// Get all series in a shelf (paginated)
    /// </summary>
    [HttpGet("{shelfId}/series")]
    public async Task<ActionResult<IList<SeriesDto>>> GetSeriesInShelf(int shelfId, CancellationToken ct)
    {
        var shelf = await unitOfWork.ShelfRepository.GetShelfAsync(shelfId, UserId, ct);
        if (shelf == null) return NotFound();

        var seriesIds = new List<int>();
        foreach (var s in shelf.Items)
            seriesIds.Add(s.Id);

        if (seriesIds.Count == 0) return Ok(new List<SeriesDto>());

        var series = await unitOfWork.SeriesRepository.GetSeriesByIdsAsync(seriesIds, false, ct);
        return Ok(series);
    }

    /// <summary>
    /// Create a new shelf
    /// </summary>
    [HttpPost("create")]
    public async Task<ActionResult<AppUserShelfDto>> CreateShelf(CreateShelfDto dto, CancellationToken ct)
    {
        if (await unitOfWork.ShelfRepository.ShelfExistsAsync(dto.Title, UserId, ct))
            return BadRequest("A shelf with this name already exists");

        var user = await unitOfWork.UserRepository.GetUserByIdAsync(UserId);
        if (user == null) return Unauthorized();

        var shelf = await shelfService.CreateShelfAsync(user, dto.Title, dto.Summary, ct);
        var result = await unitOfWork.ShelfRepository.GetShelvesForUserAsync(UserId, ct);
        return Ok(result);
    }

    /// <summary>
    /// Update shelf title/summary
    /// </summary>
    [HttpPost("update")]
    public async Task<ActionResult> UpdateShelf(UpdateShelfDto dto, CancellationToken ct)
    {
        var success = await shelfService.UpdateShelfAsync(dto.Id, UserId, dto.Title, dto.Summary, ct);
        if (!success) return BadRequest("Shelf not found or update failed");
        return Ok();
    }

    /// <summary>
    /// Delete a shelf
    /// </summary>
    [HttpDelete]
    public async Task<ActionResult> DeleteShelf(int shelfId, CancellationToken ct)
    {
        var success = await shelfService.DeleteShelfAsync(shelfId, UserId, ct);
        if (!success) return BadRequest("Shelf not found");
        return Ok();
    }

    /// <summary>
    /// Add series to a shelf
    /// </summary>
    [HttpPost("add-series")]
    public async Task<ActionResult> AddSeries(UpdateShelfSeriesDto dto, CancellationToken ct)
    {
        var success = await shelfService.AddSeriesToShelfAsync(dto.ShelfId, UserId, dto.SeriesIds, ct);
        if (!success) return BadRequest("Shelf not found or series could not be added");
        return Ok();
    }

    /// <summary>
    /// Remove series from a shelf
    /// </summary>
    [HttpPost("remove-series")]
    public async Task<ActionResult> RemoveSeries(UpdateShelfSeriesDto dto, CancellationToken ct)
    {
        var success = await shelfService.RemoveSeriesFromShelfAsync(dto.ShelfId, UserId, dto.SeriesIds, ct);
        if (!success) return BadRequest("Shelf not found or series could not be removed");
        return Ok();
    }
}
