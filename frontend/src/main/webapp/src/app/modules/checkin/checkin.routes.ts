import {Routes} from '@angular/router';
import {ScannerComponent} from './views/scanner/scanner.component';
import {CheckinComponent} from './views/checkin/checkin.component';
import {TicketScreenControlComponent} from './views/ticket-screen-control/ticket-screen-control.component';

export const routes: Routes = [
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
