using System;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Kavita.API.Database;
using Kavita.API.Repositories;
using Kavita.API.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Kavita.Server.Controllers;

/// <summary>
/// Handles direct book file uploads (EPUB, PDF) into the library
/// </summary>
public class BookUploadController(IUnitOfWork unitOfWork, ITaskScheduler taskScheduler,
    ILogger<BookUploadController> logger) : BaseApiController
{
    private static readonly string[] AllowedExtensions = [".epub", ".pdf", ".cbz", ".cbr"];

    /// <summary>
    /// Upload a book file. Places it in the first library folder under a series folder,
    /// then triggers a library scan.
    /// </summary>
    [HttpPost("upload")]
    [RequestSizeLimit(500 * 1024 * 1024)] // 500 MB
    public async Task<ActionResult> UploadBook(
        IFormFile file,
        [FromQuery] string? seriesName,
        [FromQuery] int? libraryId,
        CancellationToken ct)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file provided");

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(ext))
            return BadRequest($"Unsupported format. Allowed: {string.Join(", ", AllowedExtensions)}");

        // Resolve target library
        var library = libraryId.HasValue
            ? await unitOfWork.LibraryRepository.GetLibraryForIdAsync(libraryId.Value, LibraryIncludes.Folders, ct)
            : null;

        if (library == null)
            library = (await unitOfWork.LibraryRepository.GetLibrariesAsync(LibraryIncludes.Folders, ct: ct)).FirstOrDefault();

        if (library == null)
            return BadRequest("No library configured. Create a library first.");

        var libraryFolders = library.Folders.ToList();
        if (libraryFolders.Count == 0)
            return BadRequest("Library has no root folder configured.");

        var rootFolder = libraryFolders.First().Path;

        // Use the series name from query or derive from filename
        var title = !string.IsNullOrWhiteSpace(seriesName)
            ? seriesName
            : Path.GetFileNameWithoutExtension(file.FileName);

        // Sanitize title for use as folder/file name
        title = SanitizePath(title);

        var seriesFolder = Path.Combine(rootFolder, title);
        Directory.CreateDirectory(seriesFolder);

        var destFile = Path.Combine(seriesFolder, $"{title}{ext}");

        // If file exists, append timestamp to avoid overwriting silently
        if (System.IO.File.Exists(destFile))
            destFile = Path.Combine(seriesFolder, $"{title}_{DateTime.UtcNow:yyyyMMddHHmmss}{ext}");

        await using (var stream = new FileStream(destFile, FileMode.Create))
        {
            await file.CopyToAsync(stream, ct);
        }

        logger.LogInformation("Book uploaded: {File} by user {User}", destFile, Username);

        // Trigger async library scan
        await taskScheduler.ScanLibrary(library.Id);

        return Ok(new { message = $"'{title}' uploaded. Library scan started.", path = destFile });
    }

    private static string SanitizePath(string name)
    {
        var invalid = Path.GetInvalidFileNameChars();
        return string.Concat(name.Select(c => invalid.Contains(c) ? '_' : c)).Trim();
    }
}
