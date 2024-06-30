import {inject} from '@angular/core';
import {ActivatedRouteSnapshot, ResolveFn, Routes} from '@angular/router';
import {UserSearchComponent} from './user-search/user-search.component';
import {UserDetailComponent} from './user-detail/user-detail.component';
import {UserDataResolver} from './resolver/userdata-resolver.component';
import {UserData} from '../../api/user-api.service';
import {UserEditComponent} from './user-edit/user-edit.component';
import {PermissionsDataResolver} from './resolver/permissionsdata-resolver.component';

export const userDataResolver: ResolveFn<UserData> = (route: ActivatedRouteSnapshot) => {
  return inject(UserDataResolver).resolve(route);
};

export const routes: Routes = [
  {
    path: 'detail/:id',
    component: UserDetailComponent,
    resolve: {
      userData: userDataResolver,
    }
  },
  {
    path: 'bearbeiten/:id',
    component: UserEditComponent,
    resolve: {
      userData: userDataResolver,
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
