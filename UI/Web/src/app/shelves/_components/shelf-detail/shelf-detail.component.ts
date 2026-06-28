import {ChangeDetectionStrategy, Component, inject, OnInit, signal} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {NgForOf, NgIf} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {Shelf} from '../../../_models/shelf';
import {Series} from '../../../_models/series';
import {ShelfService} from '../../../_services/shelf.service';
import {ImageService} from '../../../_services/image.service';
import {SideNavCompanionBarComponent} from '../../../sidenav/_components/side-nav-companion-bar/side-nav-companion-bar.component';

@Component({
  selector: 'app-shelf-detail',
  standalone: true,
  imports: [NgForOf, NgIf, FormsModule, SideNavCompanionBarComponent],
  templateUrl: './shelf-detail.component.html',
  styleUrls: ['./shelf-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShelfDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly shelfService = inject(ShelfService);
  public readonly imageService = inject(ImageService);

  shelf = signal<Shelf | null>(null);
  series = signal<Series[]>([]);
  isLoading = signal(true);

  editingTitle = false;
  editTitle = '';

  dragOver = false;
  uploadFile: File | null = null;
  uploadTitle = '';
  showUploadModal = false;
  isUploading = signal(false);
  uploadMessage = signal('');

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('shelfId'));
    this.loadShelf(id);
  }

  loadShelf(shelfId: number) {
    this.isLoading.set(true);
    this.shelfService.getShelves().subscribe(shelves => {
      const found = shelves.find(s => s.id === shelfId) ?? null;
      this.shelf.set(found);
      if (found) this.editTitle = found.title;
    });
    this.shelfService.getSeriesInShelf(shelfId).subscribe({
      next: s => { this.series.set(s); this.isLoading.set(false); },
      error: () => this.isLoading.set(false)
    });
  }

  openSeries(s: Series) {
    this.router.navigate(['/library', s.libraryId, 'series', s.id]);
  }

  removeFromShelf(event: MouseEvent, s: Series) {
    event.stopPropagation();
    const shelfId = this.shelf()?.id;
    if (!shelfId) return;
    this.shelfService.removeSeriesFromShelf(shelfId, [s.id]).subscribe(() => {
      this.series.update(arr => arr.filter(x => x.id !== s.id));
      this.shelf.update(sh => sh ? {...sh, itemCount: sh.itemCount - 1} : sh);
    });
  }

  startEditTitle() {
    this.editingTitle = true;
  }

  saveTitle() {
    const s = this.shelf();
    if (!s || !this.editTitle.trim()) { this.editingTitle = false; return; }
    this.shelfService.updateShelf(s.id, this.editTitle.trim(), s.summary ?? undefined).subscribe(() => {
      this.shelf.update(sh => sh ? {...sh, title: this.editTitle.trim()} : sh);
      this.editingTitle = false;
    });
  }

  onDragOver(event: DragEvent) { event.preventDefault(); this.dragOver = true; }
  onDragLeave() { this.dragOver = false; }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.dragOver = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) this.prepareUpload(file);
  }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.prepareUpload(file);
  }

  prepareUpload(file: File) {
    this.uploadFile = file;
    this.uploadTitle = file.name.replace(/\.(epub|pdf|cbz|cbr)$/i, '');
    this.showUploadModal = true;
  }

  confirmUpload() {
    if (!this.uploadFile) return;
    this.isUploading.set(true);
    this.shelfService.uploadBook(this.uploadFile, this.uploadTitle).subscribe({
      next: res => {
        this.uploadMessage.set(res.message);
        this.isUploading.set(false);
        setTimeout(() => {
          this.showUploadModal = false;
          this.uploadFile = null;
          this.uploadTitle = '';
          this.uploadMessage.set('');
          const id = this.shelf()?.id;
          if (id) this.loadShelf(id);
        }, 2000);
      },
      error: () => {
        this.uploadMessage.set('Upload failed.');
        this.isUploading.set(false);
      }
    });
  }

  cancelUpload() {
    this.showUploadModal = false;
    this.uploadFile = null;
    this.uploadTitle = '';
    this.uploadMessage.set('');
  }

  goBack() { this.router.navigate(['/shelves']); }

  trackById(_: number, s: Series) { return s.id; }
}
