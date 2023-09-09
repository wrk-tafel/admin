import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {UserPasswordChangeComponent} from './user-passwordchange/user-passwordchange.component';
import {UserSearchComponent} from './user-search/user-search.component';

const routes: Routes = [
  {
    path: 'passwortaendern',
    component: UserPasswordChangeComponent
  },
  {
    path: 'suchen',
    component: UserSearchComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class UserRoutingModule {
}
