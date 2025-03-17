import {Routes} from '@angular/router';
import {UserSearchComponent} from './views/user-search/user-search.component';
import {UserDetailComponent} from './views/user-detail/user-detail.component';
import {UserDataResolver} from './resolver/userdata-resolver.component';
import {UserEditComponent} from './views/user-edit/user-edit.component';
import {PermissionsDataResolver} from './resolver/permissionsdata-resolver.component';

export const routes: Routes = [
  {
    path: 'detail/:id',
    component: UserDetailComponent,
    resolve: {
      userData: UserDataResolver,
    }
  },
  {
    path: 'bearbeiten/:id',
    component: UserEditComponent,
    resolve: {
      userData: UserDataResolver,
      permissionsData: PermissionsDataResolver
    }
  },
  {
    path: 'suchen',
    component: UserSearchComponent
  },
  {
    path: 'erstellen',
    component: UserEditComponent,
    resolve: {
      permissionsData: PermissionsDataResolver
    }
  }
];
