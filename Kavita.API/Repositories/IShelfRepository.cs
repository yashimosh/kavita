using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Kavita.Models.DTOs.Shelves;
using Kavita.Models.Entities.User;

namespace Kavita.API.Repositories;

public interface IShelfRepository
{
    void Add(AppUserShelf shelf);
    void Update(AppUserShelf shelf);
    void Remove(AppUserShelf shelf);

    Task<AppUserShelf?> GetShelfAsync(int shelfId, int userId, CancellationToken ct = default);
    Task<IList<AppUserShelfDto>> GetShelvesForUserAsync(int userId, CancellationToken ct = default);
    Task<IList<AppUserShelfDto>> GetShelvesBySeriesAsync(int userId, int seriesId, CancellationToken ct = default);
    Task<bool> ShelfExistsAsync(string title, int userId, CancellationToken ct = default);
}
