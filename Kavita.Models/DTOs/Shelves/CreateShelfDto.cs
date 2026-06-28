namespace Kavita.Models.DTOs.Shelves;

public sealed record CreateShelfDto
{
    public required string Title { get; init; }
    public string? Summary { get; init; }
}
