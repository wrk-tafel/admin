import {NgModule} from '@angular/core';
import {TafelIfPermissionDirective} from './security/tafel-if-permission.directive';
import {PasswordChangeFormComponent} from './views/passwordchange-form/passwordchange-form.component';
import {ReactiveFormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {
  BgColorDirective,
  ToastBodyComponent,
  ToastComponent,
  ToasterComponent,
  ToastHeaderComponent
} from '@coreui/angular';
import {TafelToasterComponent} from './views/default-layout/toasts/tafel-toaster.component';
import {TafelToastErrorComponent} from './views/default-layout/toasts/variants/error/tafel-toast-error.component';
import {TafelToastInfoComponent} from "./views/default-layout/toasts/variants/info/tafel-toast-info.component";
import {TafelToastWarnComponent} from "./views/default-layout/toasts/variants/warn/tafel-toast-warn.component";
import {TafelToastSuccessComponent} from "./views/default-layout/toasts/variants/success/tafel-toast-success.component";

@NgModule({
  declarations: [
    TafelIfPermissionDirective,
    PasswordChangeFormComponent,
    TafelToasterComponent,
    TafelToastErrorComponent,
    TafelToastInfoComponent,
    TafelToastWarnComponent,
    TafelToastSuccessComponent
  ],
  imports: [
    ReactiveFormsModule,
    CommonModule,
    ToastComponent,
    ToastHeaderComponent,
    ToastBodyComponent,
    BgColorDirective,
    ToasterComponent
  ],
  exports: [
    TafelIfPermissionDirective,
    PasswordChangeFormComponent,
    TafelToasterComponent
  ]
})
export class TafelCommonModule {
}
