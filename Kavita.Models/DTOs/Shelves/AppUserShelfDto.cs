using System;

namespace Kavita.Models.DTOs.Shelves;
#nullable enable

public sealed record AppUserShelfDto
{
    public int Id { get; init; }
    public string Title { get; init; } = default!;
    public string? Summary { get; init; }
    public string? CoverImage { get; init; }
    public int ItemCount { get; init; }
    public string? Owner { get; init; }
    public DateTime Created { get; init; }
    public DateTime LastModified { get; init; }
}
