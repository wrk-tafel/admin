import {Routes} from '@angular/router';
import {ScannerComponent} from './views/scanner/scanner.component';
import {CheckinComponent} from './views/checkin/checkin.component';
import {TicketScreenControlComponent} from './views/ticket-screen-control/ticket-screen-control.component';

export const routes: Routes = [
  {
    path: 'scanner',
    title: 'Scanner',
    component: ScannerComponent
  },
  {
    path: 'annahme',
    title: 'Annahme',
    component: CheckinComponent
  },
  {
    path: 'ticketmonitor-steuerung',
    title: 'Ticket-Monitor Steuerung',
    component: TicketScreenControlComponent
  }
];
