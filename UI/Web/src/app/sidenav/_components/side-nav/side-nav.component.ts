import {ChangeDetectionStrategy, Component, DestroyRef, effect, inject} from '@angular/core';
import {NavigationEnd, Router} from '@angular/router';
import {filter, map} from 'rxjs/operators';
import {ImageService} from 'src/app/_services/image.service';
import {EVENTS, MessageHubService} from 'src/app/_services/message-hub.service';
import {Library, LibraryType} from '../../../_models/library/library';
import {AccountService} from '../../../_services/account.service';
import {NavService} from '../../../_services/nav.service';
import {takeUntilDestroyed, toObservable} from "@angular/core/rxjs-interop";
import {BehaviorSubject, merge, Observable, of, ReplaySubject, startWith, switchMap, tap} from "rxjs";
import {AsyncPipe} from "@angular/common";
import {SideNavItemComponent} from "../side-nav-item/side-nav-item.component";
import {TranslocoDirective} from "@jsverse/transloco";
import {SideNavStream} from "../../../_models/sidenav/sidenav-stream";
import {SideNavStreamType} from "../../../_models/sidenav/sidenav-stream-type.enum";
import {LicenseService} from "../../../_services/license.service";
import {BreakpointService} from "../../../_services/breakpoint.service";

@Component({
  selector: 'app-side-nav',
  imports: [SideNavItemComponent, TranslocoDirective, AsyncPipe],
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

  private cachedData: SideNavStream[] | null = null;
  private loadDataSubject = new ReplaySubject<void>();
  private loadData$ = this.loadDataSubject.asObservable();

  private loadDataOnInit$: Observable<SideNavStream[]> = this.loadData$.pipe(
    switchMap(() => {
      if (this.cachedData != null) return of(this.cachedData);
      return this.navService.getSideNavStreams().pipe(
        map(data => { this.cachedData = data; return data; })
      );
    })
  );

  navStreams$: Observable<SideNavStream[]> = merge(
    this.loadDataOnInit$.pipe(takeUntilDestroyed(this.destroyRef)),
    this.messageHub.messages$.pipe(
      filter(event => event.event === EVENTS.LibraryModified || event.event === EVENTS.SideNavUpdate),
      tap(() => { this.cachedData = null; }),
      switchMap(() => this.loadDataOnInit$),
      takeUntilDestroyed(this.destroyRef),
    )
  ).pipe(
    startWith(null),
    filter(data => data !== null),
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

    effect(() => {
      const user = this.accountService.currentUser();
      if (!user) return;
      this.loadDataSubject.next();
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

  toggleNavBar() {
    this.navService.toggleSideNav();
  }

  protected readonly SideNavStreamType = SideNavStreamType;
}
