import {NgModule} from '@angular/core';
import {ButtonsModule} from 'ngx-bootstrap/buttons';

import {DashboardComponent} from './dashboard.component';
import {DashboardRoutingModule} from './dashboard-routing.module';
import {CommonModule} from '@angular/common';
import {ModalModule} from 'ngx-bootstrap/modal';
import {TafelIfPermissionDirective} from '../../common/security/tafel-if-permission.directive';

@NgModule({
  imports: [
    CommonModule,
    DashboardRoutingModule,
    ButtonsModule.forRoot(),
    ModalModule
  ],
  declarations: [
    DashboardComponent,
    TafelIfPermissionDirective
  ],
  exports: [
    TafelIfPermissionDirective
  ]
})
export class DashboardModule {
}
