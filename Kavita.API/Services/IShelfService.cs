using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Kavita.Models.DTOs.Shelves;
using Kavita.Models.Entities.User;

namespace Kavita.API.Services;

public interface IShelfService
{
    Task<AppUserShelf> CreateShelfAsync(AppUser user, string title, string? summary, CancellationToken ct = default);
    Task<bool> UpdateShelfAsync(int shelfId, int userId, string title, string? summary, CancellationToken ct = default);
    Task<bool> DeleteShelfAsync(int shelfId, int userId, CancellationToken ct = default);
    Task<bool> AddSeriesToShelfAsync(int shelfId, int userId, IList<int> seriesIds, CancellationToken ct = default);
    Task<bool> RemoveSeriesFromShelfAsync(int shelfId, int userId, IList<int> seriesIds, CancellationToken ct = default);
}
