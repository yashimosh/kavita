using System;
using System.Collections.Generic;
using Kavita.Models.Entities.Interfaces;

namespace Kavita.Models.Entities.User;

/// <summary>
/// A named shelf owned by a user for organizing Series (books)
/// </summary>
public class AppUserShelf : IEntityDate
{
    public int Id { get; set; }
    public required string Title { get; set; }
    public required string NormalizedTitle { get; set; }
    public string? Summary { get; set; }
    public string? CoverImage { get; set; }

    public ICollection<Series.Series> Items { get; set; } = [];

    public DateTime Created { get; set; }
    public DateTime LastModified { get; set; }
    public DateTime CreatedUtc { get; set; }
    public DateTime LastModifiedUtc { get; set; }

    // Ownership
    public AppUser AppUser { get; set; } = null!;
    public int AppUserId { get; set; }
}
