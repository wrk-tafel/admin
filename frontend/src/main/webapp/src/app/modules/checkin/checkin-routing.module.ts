import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {ScannerComponent} from './scanner/scanner.component';
import {CheckinComponent} from './checkin/checkin.component';
import {TicketScreenControlComponent} from './ticket-screen-control/ticket-screen-control.component';

const routes: Routes = [
  {
    path: 'scanner',
    component: ScannerComponent
  },
  {
    path: 'annahme',
    component: CheckinComponent
  },
  {
    path: 'ticketmonitor-steuerung',
    component: TicketScreenControlComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CheckinRoutingModule {
}
