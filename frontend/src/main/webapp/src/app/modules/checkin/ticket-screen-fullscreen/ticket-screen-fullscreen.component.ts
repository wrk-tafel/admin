import {Component} from '@angular/core';
import {TicketScreenComponent} from '../ticket-screen/ticket-screen.component';

@Component({
  selector: 'tafel-ticket-screen-fullscreen',
  templateUrl: 'ticket-screen-fullscreen.component.html',
  imports: [
    TicketScreenComponent
  ],
  standalone: true
})
export class TicketScreenFullscreenComponent {
}
