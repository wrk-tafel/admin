import {inject, NgModule} from '@angular/core';
import {ActivatedRouteSnapshot, ResolveFn, RouterModule, Routes} from '@angular/router';
import {UserPasswordChangeComponent} from './user-passwordchange/user-passwordchange.component';
import {UserSearchComponent} from './user-search/user-search.component';
import {UserDetailComponent} from './user-detail/user-detail.component';
import {UserDataResolver} from './resolver/userdata-resolver.component';
import {UserData} from '../../api/user-api.service';
import {UserEditComponent} from "./user-edit/user-edit.component";

export const userDataResolver: ResolveFn<UserData> = (route: ActivatedRouteSnapshot) => {
  return inject(UserDataResolver).resolve(route);
};

const routes: Routes = [
  {
    path: 'passwortaendern',
    component: UserPasswordChangeComponent
  },
  {
    path: 'detail/:id',
    component: UserDetailComponent,
    resolve: {
      userData: userDataResolver,
    }
  },
  {
    path: 'suchen',
    component: UserSearchComponent
  },
  {
    path: 'erstellen',
    component: UserEditComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class UserRoutingModule {
}
