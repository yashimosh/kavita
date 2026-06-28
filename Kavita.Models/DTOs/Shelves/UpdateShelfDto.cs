namespace Kavita.Models.DTOs.Shelves;

public sealed record UpdateShelfDto
{
    public int Id { get; init; }
    public required string Title { get; init; }
    public string? Summary { get; init; }
}
