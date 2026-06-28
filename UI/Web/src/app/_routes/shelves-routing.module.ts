import {Routes} from '@angular/router';
import {AllShelvesComponent} from '../shelves/_components/all-shelves/all-shelves.component';
import {ShelfDetailComponent} from '../shelves/_components/shelf-detail/shelf-detail.component';

export const routes: Routes = [
  {path: '', component: AllShelvesComponent, pathMatch: 'full', title: 'Shelves'},
  {path: ':shelfId', component: ShelfDetailComponent, title: 'Shelf'},
];
