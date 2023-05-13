import {Component} from '@angular/core';
import {FormControl, FormGroup} from '@angular/forms';
import {WebsocketService} from '../../../common/websocket/websocket.service';
import {TicketScreenMessage} from '../ticket-screen/ticket-screen.component';

@Component({
  selector: 'tafel-ticket-screen-control',
  templateUrl: 'ticket-screen-control.component.html'
})
export class TicketScreenControlComponent {

  constructor(
    private websocketService: WebsocketService
  ) {
  }

  form = new FormGroup({
    startTime: new FormControl<string>(null)
  });

  openScreenInNewTab() {
    window.open('/#/anmeldung/ticketmonitor', '_blank');
  }

  showStartTime() {
    const time = this.form.get('startTime').value;
    const startTime = new Date();
    startTime.setHours(Number(time.split(':')[0]));
    startTime.setMinutes(Number(time.split(':')[1]));

    const message: TicketScreenMessage = {startTime: startTime};
    this.websocketService.publish({destination: '/topic/ticket-screen', body: JSON.stringify(message)});
  }

}
