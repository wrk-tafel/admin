import {NgModule} from '@angular/core';
import {TafelIfPermissionDirective} from './security/tafel-if-permission.directive';
import {PasswordChangeFormComponent} from './views/passwordchange-form/passwordchange-form.component';
import {ReactiveFormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {ErrorToastComponent} from './views/default-layout/errortoast/error-toast.component';

@NgModule({
  declarations: [
    TafelIfPermissionDirective,
    PasswordChangeFormComponent,
    ErrorToastComponent
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
