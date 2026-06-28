import {HttpClient} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {environment} from 'src/environments/environment';
import {Shelf} from '../_models/shelf';
import {Series} from '../_models/series';

@Injectable({
  providedIn: 'root'
})
export class ShelfService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  getShelves() {
    return this.http.get<Shelf[]>(this.baseUrl + 'shelf');
  }

  getShelvesForSeries(seriesId: number) {
    return this.http.get<Shelf[]>(this.baseUrl + `shelf/series?seriesId=${seriesId}`);
  }

  getSeriesInShelf(shelfId: number) {
    return this.http.get<Series[]>(this.baseUrl + `shelf/${shelfId}/series`);
  }

  createShelf(title: string, summary?: string) {
    return this.http.post<Shelf[]>(this.baseUrl + 'shelf/create', {title, summary});
  }

  updateShelf(id: number, title: string, summary?: string) {
    return this.http.post(this.baseUrl + 'shelf/update', {id, title, summary});
  }

  deleteShelf(shelfId: number) {
    return this.http.delete(this.baseUrl + `shelf?shelfId=${shelfId}`);
  }

  addSeriesToShelf(shelfId: number, seriesIds: number[]) {
    return this.http.post(this.baseUrl + 'shelf/add-series', {shelfId, seriesIds});
  }

  removeSeriesFromShelf(shelfId: number, seriesIds: number[]) {
    return this.http.post(this.baseUrl + 'shelf/remove-series', {shelfId, seriesIds});
  }

  uploadBook(file: File, seriesName?: string, libraryId?: number) {
    const form = new FormData();
    form.append('file', file);
    let url = this.baseUrl + 'bookupload/upload';
    const params: string[] = [];
    if (seriesName) params.push(`seriesName=${encodeURIComponent(seriesName)}`);
    if (libraryId) params.push(`libraryId=${libraryId}`);
    if (params.length) url += '?' + params.join('&');
    return this.http.post<{message: string; path: string}>(url, form);
  }
}
