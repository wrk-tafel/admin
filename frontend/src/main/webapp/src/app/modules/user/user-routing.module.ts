import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {UserPasswordChangeComponent} from './user-passwordchange/user-passwordchange.component';

const routes: Routes = [
  {
    path: 'passwortaendern',
    component: UserPasswordChangeComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class UserRoutingModule {
}
