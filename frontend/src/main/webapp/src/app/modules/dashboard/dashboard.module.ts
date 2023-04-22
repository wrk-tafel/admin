import {NgModule} from '@angular/core';
import {DashboardComponent} from './dashboard.component';
import {DashboardRoutingModule} from './dashboard-routing.module';
import {CommonModule} from '@angular/common';
import {TafelCommonModule} from '../../common/tafel-common.module';
import {DistributionStateComponent} from './components/distribution-state/distribution-state.component';
import {RegisteredCustomersComponent} from './components/registered-customers/registered-customers.component';
import {
    ButtonModule,
    CardBodyComponent, CardComponent, CardGroupComponent, ColComponent,
    ModalModule,
    ProgressBarComponent,
    ProgressComponent,
    ProgressModule, RowComponent
} from '@coreui/angular';

@NgModule({
    imports: [
        CommonModule,
        TafelCommonModule,
        DashboardRoutingModule,
        ButtonModule,
        ModalModule,
        ProgressModule,
        ProgressBarComponent,
        ProgressComponent,
        CardBodyComponent,
        CardComponent,
        CardGroupComponent,
        ColComponent,
        RowComponent
    ],
  declarations: [
    DashboardComponent,
    DistributionStateComponent,
    RegisteredCustomersComponent
  ]
})
export class DashboardModule {
}
