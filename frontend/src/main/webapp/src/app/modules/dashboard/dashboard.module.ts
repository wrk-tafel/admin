import {NgModule} from '@angular/core';
import {ButtonsModule} from 'ngx-bootstrap/buttons';

import {DashboardComponent} from './dashboard.component';
import {DashboardRoutingModule} from './dashboard-routing.module';
import {CommonModule} from '@angular/common';
import {ModalModule} from 'ngx-bootstrap/modal';

@NgModule({
  imports: [
    CommonModule,
    DashboardRoutingModule,
    ButtonsModule.forRoot(),
    ModalModule
  ],
  declarations: [
    DashboardComponent
  ]
})
export class DashboardModule {
}
