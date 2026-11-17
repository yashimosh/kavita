using System.Collections.Generic;
using Kavita.Models.Entities.Enums;

namespace Kavita.Models.DTOs.Reader;

public sealed record BookInfoDto : IChapterInfoDto
{
    public string BookTitle { get; set; } = default! ;
    public int SeriesId { get; set; }
    public int VolumeId { get; set; }
    public MangaFormat SeriesFormat { get; set; }
    public string SeriesName { get; set; } = default! ;
    public string ChapterNumber { get; set; } = default! ;
    public string VolumeNumber { get; set; } = default! ;
    public int LibraryId { get; set; }
    public int Pages { get; set; }
    public bool IsSpecial { get; set; }
    public string ChapterTitle { get; set; } = default! ;
    /// <summary>
    /// Epub only. Estimated word count of each reading-order section, indexed by page (section) number. Lets the reader
    /// weight sections by length when estimating a book-wide page count. Null if it couldn't be calculated.
    /// </summary>
    public IList<int>? SectionWordCounts { get; set; }
}
