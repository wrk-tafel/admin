import {NgModule} from '@angular/core';
import {TafelIfPermissionDirective} from './security/tafel-if-permission.directive';
import {PasswordChangeFormComponent} from './views/passwordchange-form/passwordchange-form.component';
import {ReactiveFormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';

@NgModule({
  declarations: [
    TafelIfPermissionDirective,
    PasswordChangeFormComponent
  ],
  imports: [
    ReactiveFormsModule,
    CommonModule
  ],
  exports: [
    TafelIfPermissionDirective,
    PasswordChangeFormComponent
  ]
})
// TODO add also views, services, etc?
export class TafelCommonModule {
}
