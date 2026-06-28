import {ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, effect, inject} from '@angular/core';
import {NavigationEnd, Router} from '@angular/router';
import {filter, map, switchMap, tap} from 'rxjs/operators';
import {ImageService} from 'src/app/_services/image.service';
import {Library, LibraryType} from '../../../_models/library/library';
import {AccountService} from '../../../_services/account.service';
import {NavService} from '../../../_services/nav.service';
import {EVENTS, MessageHubService} from '../../../_services/message-hub.service';
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";
import {BehaviorSubject, merge, Observable, of, ReplaySubject, startWith} from "rxjs";
import {AsyncPipe} from "@angular/common";
import {SideNavItemComponent} from "../side-nav-item/side-nav-item.component";
import {TranslocoDirective} from "@jsverse/transloco";
import {SideNavStreamType} from "../../../_models/sidenav/sidenav-stream-type.enum";
import {LicenseService} from "../../../_services/license.service";
import {BreakpointService} from "../../../_services/breakpoint.service";
import {ShelfService} from '../../../_services/shelf.service';
import {Shelf} from '../../../_models/shelf';
import {FormsModule} from '@angular/forms';
import {ToastrService} from 'ngx-toastr';

@Component({
  selector: 'app-side-nav',
  imports: [SideNavItemComponent, TranslocoDirective, AsyncPipe, FormsModule],
  templateUrl: './side-nav.component.html',
  styleUrls: ['./side-nav.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SideNavComponent {
  private readonly router = inject(Router);
  private readonly messageHub = inject(MessageHubService);
  protected readonly navService = inject(NavService);
  private readonly imageService = inject(ImageService);
  protected readonly accountService = inject(AccountService);
  protected readonly licenseService = inject(LicenseService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly breakpointService = inject(BreakpointService);
  private readonly shelfService = inject(ShelfService);
  private readonly toastr = inject(ToastrService);
  private readonly cdRef = inject(ChangeDetectorRef);

  showNewShelfModal = false;
  newShelfTitle = '';

  private shelvesRefresh$ = new BehaviorSubject<void>(undefined);

  shelves$: Observable<Shelf[]> = this.shelvesRefresh$.pipe(
    switchMap(() => this.shelfService.getShelves()),
    takeUntilDestroyed(this.destroyRef),
  );

  collapseSideNavOnMobileNav$ = this.router.events.pipe(
    filter(event => event instanceof NavigationEnd),
    takeUntilDestroyed(this.destroyRef),
    map(evt => evt as NavigationEnd),
    filter(() => this.breakpointService.isMobile() && this.navService.sideNavCollapsedSignal()),
    filter(collapsed => !collapsed)
  );

  constructor() {
    if (this.breakpointService.isMobile()) {
      this.navService.collapseSideNav(true);
    }
    this.collapseSideNavOnMobileNav$.subscribe(() => {
      this.navService.collapseSideNav(false);
    });
  }

  toggleNavBar() {
    this.navService.toggleSideNav();
  }

  openNewShelf() {
    this.showNewShelfModal = true;
    this.cdRef.markForCheck();
  }

  closeNewShelf() {
    this.showNewShelfModal = false;
    this.newShelfTitle = '';
    this.cdRef.markForCheck();
  }

  createShelf() {
    const title = this.newShelfTitle.trim();
    if (!title) return;
    this.shelfService.createShelf(title).subscribe({
      next: () => {
        this.closeNewShelf();
        this.shelvesRefresh$.next();
      },
      error: () => this.toastr.error('Could not create shelf')
    });
  }

  getLibraryTypeIcon(format: LibraryType) {
    switch (format) {
      case LibraryType.Book:
      case LibraryType.LightNovel:
        return 'fa-book';
      case LibraryType.Comic:
      case LibraryType.ComicVine:
      case LibraryType.Manga:
        return 'fa-book-open';
      case LibraryType.Images:
        return 'fa-images';
    }
  }

  getLibraryImage(library: Library) {
    if (library.coverImage) return this.imageService.getLibraryCoverImage(library.id);
    return null;
  }

  protected readonly SideNavStreamType = SideNavStreamType;
}
