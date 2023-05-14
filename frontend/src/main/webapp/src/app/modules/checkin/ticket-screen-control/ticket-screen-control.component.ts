import {Component} from '@angular/core';
import {FormControl, FormGroup} from '@angular/forms';
import {WebsocketService} from '../../../common/websocket/websocket.service';
import {TicketScreenMessage} from '../ticket-screen/ticket-screen.component';
import {DistributionApiService, TicketNumberResponse} from '../../../api/distribution-api.service';

@Component({
  selector: 'tafel-ticket-screen-control',
  templateUrl: 'ticket-screen-control.component.html'
})
export class TicketScreenControlComponent {

  constructor(
    private websocketService: WebsocketService,
    private distributionApiService: DistributionApiService
  ) {
  }

  form = new FormGroup({
    startTime: new FormControl<string>(null)
  });

  currentTicketNumber: number = 100;

  openScreenInNewTab() {
    window.open('/#/anmeldung/ticketmonitor', '_blank');
  }

  showStartTime() {
    const time = this.form.get('startTime').value;
    const startTime = new Date();
    startTime.setHours(Number(time.split(':')[0]));
    startTime.setMinutes(Number(time.split(':')[1]));

    this.sendToTicketScreen({startTime: startTime});
  }

  showCurrentTicket() {
    this.distributionApiService.getCurrentTicket().subscribe((response: TicketNumberResponse) => {
      this.sendToTicketScreen({ticketNumber: response.ticketNumber});
    });
  }

  showNextTicket() {
    this.currentTicketNumber = this.currentTicketNumber + 1;
    this.sendToTicketScreen({ticketNumber: this.currentTicketNumber});
  }

  private sendToTicketScreen(message: TicketScreenMessage) {
    this.websocketService.publish({destination: '/topic/ticket-screen', body: JSON.stringify(message)});
  }

}
