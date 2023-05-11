import {Component} from '@angular/core';
import {FormControl, FormGroup} from '@angular/forms';

@Component({
  selector: 'tafel-ticket-screen-control',
  templateUrl: 'ticket-screen-control.component.html'
})
export class TicketScreenControlComponent {

  form = new FormGroup({
    startDate: new FormControl<string>(null)
  });

  openScreenInNewTab() {
    window.open('/#/anmeldung/ticketmonitor', '_blank');
  }

}
