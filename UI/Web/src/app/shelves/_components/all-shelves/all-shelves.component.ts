import {ChangeDetectionStrategy, Component, inject, OnInit, signal} from '@angular/core';
import {Router} from '@angular/router';
import {NgForOf, NgIf} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {Shelf} from '../../../_models/shelf';
import {ShelfService} from '../../../_services/shelf.service';
import {ImageService} from '../../../_services/image.service';
import {SideNavCompanionBarComponent} from '../../../sidenav/_components/side-nav-companion-bar/side-nav-companion-bar.component';

@Component({
  selector: 'app-all-shelves',
  standalone: true,
  imports: [NgForOf, NgIf, FormsModule, SideNavCompanionBarComponent],
  templateUrl: './all-shelves.component.html',
  styleUrls: ['./all-shelves.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AllShelvesComponent implements OnInit {
  private readonly shelfService = inject(ShelfService);
  private readonly router = inject(Router);
  public readonly imageService = inject(ImageService);

  shelves = signal<Shelf[]>([]);
  isLoading = signal(true);

  newShelfTitle = '';
  showCreateForm = false;
  dragOver = false;
  uploadFile: File | null = null;
  uploadTitle = '';
  showUploadModal = false;
  isUploading = signal(false);
  uploadMessage = signal('');

  ngOnInit() {
    this.loadShelves();
  }

  loadShelves() {
    this.isLoading.set(true);
    this.shelfService.getShelves().subscribe({
      next: shelves => {
        this.shelves.set(shelves);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  openShelf(shelf: Shelf) {
    this.router.navigate(['/shelves', shelf.id]);
  }

  createShelf() {
    if (!this.newShelfTitle.trim()) return;
    this.shelfService.createShelf(this.newShelfTitle.trim()).subscribe(shelves => {
      this.shelves.set(shelves);
      this.newShelfTitle = '';
      this.showCreateForm = false;
    });
  }

  deleteShelf(event: MouseEvent, shelf: Shelf) {
    event.stopPropagation();
    if (!confirm(`Delete shelf "${shelf.title}"? Books won't be deleted.`)) return;
    this.shelfService.deleteShelf(shelf.id).subscribe(() => {
      this.shelves.update(s => s.filter(x => x.id !== shelf.id));
    });
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.dragOver = true;
  }

  onDragLeave() {
    this.dragOver = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.dragOver = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) this.prepareUpload(file);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
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
    this.uploadMessage.set('');
    this.shelfService.uploadBook(this.uploadFile, this.uploadTitle).subscribe({
      next: res => {
        this.uploadMessage.set(res.message);
        this.isUploading.set(false);
        this.uploadFile = null;
        this.uploadTitle = '';
        setTimeout(() => {
          this.showUploadModal = false;
          this.uploadMessage.set('');
        }, 2000);
      },
      error: () => {
        this.uploadMessage.set('Upload failed. Check the file and try again.');
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

  trackById(_: number, shelf: Shelf) {
    return shelf.id;
  }
}
