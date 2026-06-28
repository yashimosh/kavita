using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Kavita.API.Database;
using Kavita.API.Services;
using Kavita.Models.Entities.User;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Kavita.Services;

public class ShelfService(IUnitOfWork unitOfWork, ILogger<ShelfService> logger) : IShelfService
{
    public async Task<AppUserShelf> CreateShelfAsync(AppUser user, string title, string? summary, CancellationToken ct = default)
    {
        var shelf = new AppUserShelf
        {
            Title = title,
            NormalizedTitle = title.ToUpperInvariant(),
            Summary = summary,
            AppUserId = user.Id,
            Created = DateTime.UtcNow,
            CreatedUtc = DateTime.UtcNow,
            LastModified = DateTime.UtcNow,
            LastModifiedUtc = DateTime.UtcNow,
        };

        unitOfWork.ShelfRepository.Add(shelf);
        await unitOfWork.CommitAsync(ct);
        return shelf;
    }

    public async Task<bool> UpdateShelfAsync(int shelfId, int userId, string title, string? summary, CancellationToken ct = default)
    {
        var shelf = await unitOfWork.ShelfRepository.GetShelfAsync(shelfId, userId, ct);
        if (shelf == null) return false;

        shelf.Title = title;
        shelf.NormalizedTitle = title.ToUpperInvariant();
        shelf.Summary = summary;
        shelf.LastModified = DateTime.UtcNow;
        shelf.LastModifiedUtc = DateTime.UtcNow;

        unitOfWork.ShelfRepository.Update(shelf);
        return await unitOfWork.CommitAsync(ct);
    }

    public async Task<bool> DeleteShelfAsync(int shelfId, int userId, CancellationToken ct = default)
    {
        var shelf = await unitOfWork.ShelfRepository.GetShelfAsync(shelfId, userId, ct);
        if (shelf == null) return false;

        unitOfWork.ShelfRepository.Remove(shelf);
        return await unitOfWork.CommitAsync(ct);
    }

    public async Task<bool> AddSeriesToShelfAsync(int shelfId, int userId, IList<int> seriesIds, CancellationToken ct = default)
    {
        var shelf = await unitOfWork.ShelfRepository.GetShelfAsync(shelfId, userId, ct);
        if (shelf == null) return false;

        var series = await unitOfWork.SeriesRepository.GetSeriesByIdsAsync(seriesIds);
        foreach (var s in series)
        {
            if (shelf.Items.All(i => i.Id != s.Id))
                shelf.Items.Add(s);
        }

        shelf.LastModified = DateTime.UtcNow;
        shelf.LastModifiedUtc = DateTime.UtcNow;
        unitOfWork.ShelfRepository.Update(shelf);
        return await unitOfWork.CommitAsync(ct);
    }

    public async Task<bool> RemoveSeriesFromShelfAsync(int shelfId, int userId, IList<int> seriesIds, CancellationToken ct = default)
    {
        var shelf = await unitOfWork.ShelfRepository.GetShelfAsync(shelfId, userId, ct);
        if (shelf == null) return false;

        var toRemove = shelf.Items.Where(i => seriesIds.Contains(i.Id)).ToList();
        foreach (var s in toRemove)
            shelf.Items.Remove(s);

        shelf.LastModified = DateTime.UtcNow;
        shelf.LastModifiedUtc = DateTime.UtcNow;
        unitOfWork.ShelfRepository.Update(shelf);
        return await unitOfWork.CommitAsync(ct);
    }
}
