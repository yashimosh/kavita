using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using AutoMapper;
using AutoMapper.QueryableExtensions;
using Kavita.API.Repositories;
using Kavita.Models.DTOs.Shelves;
using Kavita.Models.Entities.User;
using Microsoft.EntityFrameworkCore;

namespace Kavita.Database.Repositories;

public class ShelfRepository(DataContext context, IMapper mapper) : IShelfRepository
{
    public void Add(AppUserShelf shelf) => context.AppUserShelf.Add(shelf);

    public void Update(AppUserShelf shelf) => context.Entry(shelf).State = EntityState.Modified;

    public void Remove(AppUserShelf shelf) => context.AppUserShelf.Remove(shelf);

    public async Task<AppUserShelf?> GetShelfAsync(int shelfId, int userId, CancellationToken ct = default)
    {
        return await context.AppUserShelf
            .Include(s => s.Items)
            .Where(s => s.Id == shelfId && s.AppUserId == userId)
            .FirstOrDefaultAsync(ct);
    }

    public async Task<IList<AppUserShelfDto>> GetShelvesForUserAsync(int userId, CancellationToken ct = default)
    {
        return await context.AppUserShelf
            .Where(s => s.AppUserId == userId)
            .OrderBy(s => s.Title)
            .ProjectTo<AppUserShelfDto>(mapper.ConfigurationProvider)
            .ToListAsync(ct);
    }

    public async Task<IList<AppUserShelfDto>> GetShelvesBySeriesAsync(int userId, int seriesId, CancellationToken ct = default)
    {
        return await context.AppUserShelf
            .Where(s => s.AppUserId == userId && s.Items.Any(i => i.Id == seriesId))
            .OrderBy(s => s.Title)
            .ProjectTo<AppUserShelfDto>(mapper.ConfigurationProvider)
            .ToListAsync(ct);
    }

    public async Task<bool> ShelfExistsAsync(string title, int userId, CancellationToken ct = default)
    {
        var normalized = title.ToUpperInvariant();
        return await context.AppUserShelf
            .AnyAsync(s => s.AppUserId == userId && s.NormalizedTitle == normalized, ct);
    }
}
