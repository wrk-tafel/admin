import {NgModule} from '@angular/core';
import {TafelIfPermissionDirective} from './security/tafel-if-permission.directive';

@NgModule({
  declarations: [
    TafelIfPermissionDirective
  ],
  exports: [
    TafelIfPermissionDirective
  ]
})
// TODO adding also views, services, etc?
export class TafelCommonModule {
}
