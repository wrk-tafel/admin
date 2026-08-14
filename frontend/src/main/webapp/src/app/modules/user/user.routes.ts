import {Routes} from '@angular/router';
import {UserSearchComponent} from './views/user-search/user-search.component';
import {UserDetailComponent} from './views/user-detail/user-detail.component';
import {UserDataResolver} from './resolver/userdata-resolver.component';
import {UserEditComponent} from './views/user-edit/user-edit.component';
import {PermissionsDataResolver} from './resolver/permissionsdata-resolver.component';
import {UserLoginAttemptsComponent} from './views/login-attempts/user-login-attempts.component';
import {unsavedChangesGuard} from '../../common/guards/unsaved-changes.guard';

export const routes: Routes = [
  {
    path: 'detail/:id',
    title: 'Benutzer-Details',
    component: UserDetailComponent,
    resolve: {
      userData: UserDataResolver,
      permissionsData: PermissionsDataResolver,
    }
  },
  {
    path: 'bearbeiten/:id',
    title: 'Benutzer bearbeiten',
    component: UserEditComponent,
    resolve: {
      userData: UserDataResolver,
      permissionsData: PermissionsDataResolver
    },
    canDeactivate: [unsavedChangesGuard]
  },
  {
    path: 'suchen',
    title: 'Benutzer suchen',
    component: UserSearchComponent
  },
  {
    path: 'erstellen',
    title: 'Benutzer anlegen',
    component: UserEditComponent,
    resolve: {
      permissionsData: PermissionsDataResolver
    },
    canDeactivate: [unsavedChangesGuard]
  },
  {
    path: 'anmelde-versuche',
    title: 'Anmelde-Versuche',
    component: UserLoginAttemptsComponent
  }
];
