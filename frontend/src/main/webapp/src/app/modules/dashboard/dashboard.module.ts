import {NgModule} from '@angular/core';
import {ButtonsModule} from 'ngx-bootstrap/buttons';

import {DashboardComponent} from './dashboard.component';
import {DashboardRoutingModule} from './dashboard-routing.module';
import {CommonModule} from '@angular/common';
import {ModalModule} from 'ngx-bootstrap/modal';
import {TafelCommonModule} from '../../common/tafel-common.module';
import {DistributionStateComponent} from './components/distribution-state/distribution-state.component';
import {ProgressbarModule} from 'ngx-bootstrap/progressbar';
import {RegisteredCustomersComponent} from './components/registered-customers/registered-customers.component';

@NgModule({
    imports: [
        CommonModule,
        TafelCommonModule,
        DashboardRoutingModule,
        ButtonsModule.forRoot(),
        ModalModule,
        ProgressbarModule
    ],
  declarations: [
    DashboardComponent,
    DistributionStateComponent,
    RegisteredCustomersComponent
  ]
})
export class DashboardModule {
}
