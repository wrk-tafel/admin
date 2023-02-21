import {NgModule} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {ChartsModule} from 'ng2-charts';
import {BsDropdownModule} from 'ngx-bootstrap/dropdown';
import {ButtonsModule} from 'ngx-bootstrap/buttons';

import {DashboardComponent} from './dashboard.component';
import {DashboardRoutingModule} from './dashboard-routing.module';
import {CommonModule} from '@angular/common';
import {ModalModule} from "ngx-bootstrap/modal";

@NgModule({
    imports: [
        FormsModule,
        DashboardRoutingModule,
        ChartsModule,
        BsDropdownModule,
        ButtonsModule.forRoot(),
        CommonModule,
        ModalModule
    ],
  declarations: [DashboardComponent]
})
export class DashboardModule {
}
