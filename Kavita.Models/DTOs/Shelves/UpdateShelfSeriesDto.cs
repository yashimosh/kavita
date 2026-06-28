using System.Collections.Generic;

namespace Kavita.Models.DTOs.Shelves;

public sealed record UpdateShelfSeriesDto
{
    public int ShelfId { get; init; }
    public required IList<int> SeriesIds { get; init; }
}
