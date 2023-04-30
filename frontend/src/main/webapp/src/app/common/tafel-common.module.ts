import {NgModule} from '@angular/core';
import {TafelIfPermissionDirective} from './security/tafel-if-permission.directive';
import {PasswordChangeFormComponent} from './views/passwordchange-form/passwordchange-form.component';
import {ReactiveFormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {
  BgColorDirective,
  ProgressBarComponent,
  ProgressComponent,
  ToastBodyComponent,
  ToastComponent,
  ToasterComponent,
  ToastHeaderComponent
} from '@coreui/angular';
import {TafelToasterComponent} from './views/default-layout/toasts/tafel-toaster.component';
import {TafelToastComponent} from './views/default-layout/toasts/toast/tafel-toast.component';

@NgModule({
  declarations: [
    TafelIfPermissionDirective,
    PasswordChangeFormComponent,
    TafelToasterComponent,
    TafelToastComponent
  ],
  imports: [
    ReactiveFormsModule,
    CommonModule,
    ToastComponent,
    ToastHeaderComponent,
    ToastBodyComponent,
    BgColorDirective,
    ToasterComponent,
    ProgressComponent,
    ProgressBarComponent
  ],
  exports: [
    TafelIfPermissionDirective,
    PasswordChangeFormComponent,
    TafelToasterComponent
  ]
})
export class TafelCommonModule {
}
