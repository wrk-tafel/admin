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
// TODO add also views, services, etc?
export class TafelCommonModule {
}
