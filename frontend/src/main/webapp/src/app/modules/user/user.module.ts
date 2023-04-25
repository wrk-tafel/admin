import {NgModule} from '@angular/core';
import {UserPasswordChangeComponent} from './user-passwordchange/user-passwordchange.component';
import {UserRoutingModule} from './user-routing.module';

@NgModule({
  imports: [
    UserRoutingModule
  ],
  declarations: [
    UserPasswordChangeComponent
  ]
})
export class UserModule {
}
