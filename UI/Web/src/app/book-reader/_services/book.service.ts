import {HttpClient} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {Observable, of, tap} from 'rxjs';
import {TextResonse} from 'src/app/_types/text-response';
import {environment} from 'src/environments/environment';
import {BookChapterItem} from '../_models/book-chapter-item';
import {BookInfo} from '../_models/book-info';

const PAGE_CACHE_MAX = 30; // keep at most 30 pages in memory

@Injectable({
  providedIn: 'root'
})
export class BookService {

  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  // In-memory page cache: key = `{chapterId}:{page}`
  private readonly pageCache = new Map<string, string>();
  private readonly cacheOrder: string[] = [];

  private cacheKey(chapterId: number, page: number) {
    return `${chapterId}:${page}`;
  }

  private storeInCache(key: string, html: string) {
    if (this.pageCache.has(key)) return;
    this.pageCache.set(key, html);
    this.cacheOrder.push(key);
    if (this.cacheOrder.length > PAGE_CACHE_MAX) {
      const evict = this.cacheOrder.shift()!;
      this.pageCache.delete(evict);
    }
  }

  getBookChapters(chapterId: number) {
    return this.http.get<Array<BookChapterItem>>(this.baseUrl + 'book/' + chapterId + '/chapters');
  }

  getBookPage(chapterId: number, page: number): Observable<string> {
    const key = this.cacheKey(chapterId, page);
    const cached = this.pageCache.get(key);
    if (cached !== undefined) return of(cached);

    return this.http.get<string>(this.baseUrl + 'book/' + chapterId + '/book-page?page=' + page, TextResonse)
      .pipe(tap(html => this.storeInCache(key, html)));
  }

  /** Silently prefetch pages adjacent to the current one. */
  prefetchPages(chapterId: number, currentPage: number, maxPage: number) {
    const candidates = [currentPage + 1, currentPage + 2, currentPage - 1].filter(
      p => p >= 0 && p < maxPage && !this.pageCache.has(this.cacheKey(chapterId, p))
    );
    for (const p of candidates) {
      const key = this.cacheKey(chapterId, p);
      this.http.get<string>(this.baseUrl + 'book/' + chapterId + '/book-page?page=' + p, TextResonse)
        .subscribe(html => this.storeInCache(key, html));
    }
  }

  clearChapterCache(chapterId: number) {
    const prefix = `${chapterId}:`;
    for (const key of [...this.cacheOrder]) {
      if (key.startsWith(prefix)) {
        this.pageCache.delete(key);
        this.cacheOrder.splice(this.cacheOrder.indexOf(key), 1);
      }
    }
  }

  getBookInfo(chapterId: number, includeWordCounts: boolean = false) {
    return this.http.get<BookInfo>(this.baseUrl + `book/${chapterId}/book-info?includeWordCounts=${includeWordCounts}`);
  }

  getBookPageUrl(chapterId: number, page: number) {
    return this.baseUrl + 'book/' + chapterId + '/book-page?page=' + page;
  }
}
