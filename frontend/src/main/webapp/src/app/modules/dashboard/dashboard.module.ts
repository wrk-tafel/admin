import {NgModule} from '@angular/core';
import {ButtonsModule} from 'ngx-bootstrap/buttons';

import {DashboardComponent} from './dashboard.component';
import {DashboardRoutingModule} from './dashboard-routing.module';
import {CommonModule} from '@angular/common';
import {ModalModule} from 'ngx-bootstrap/modal';
import {TafelCommonModule} from '../../common/tafel-common.module';

@NgModule({
  imports: [
    CommonModule,
    TafelCommonModule,
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
