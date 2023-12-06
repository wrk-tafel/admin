import {Component, inject} from '@angular/core';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {WebsocketService} from '../../../common/websocket/websocket.service';
import {TicketScreenMessage} from '../ticket-screen/ticket-screen.component';
import {DistributionTicketApiService, TicketNumberResponse} from '../../../api/distribution-ticket-api.service';
import {UrlHelperService} from '../../../common/util/url-helper.service';

@Component({
  selector: 'tafel-ticket-screen-control',
  templateUrl: 'ticket-screen-control.component.html'
})
export class TicketScreenControlComponent {
  form = new FormGroup({
    startTime: new FormControl<string>(null, Validators.required)
  });
  private websocketService = inject(WebsocketService);
  private distributionTicketApiService = inject(DistributionTicketApiService);
  private urlHelperService = inject(UrlHelperService);

  get startTime() {
    return this.form.get('startTime');
  }

  openScreenInNewTab() {
    const baseUrl = this.urlHelperService.getBaseUrl();
    window.open(`${baseUrl}/#/anmeldung/ticketmonitor`, '_blank');
  }

  showStartTime() {
    this.form.markAllAsTouched();

    const time = this.startTime.value;
    if (time) {
      const startTime = new Date();
      startTime.setHours(Number(time.split(':')[0]));
      startTime.setMinutes(Number(time.split(':')[1]));
      startTime.setSeconds(0);
      startTime.setMilliseconds(0);

      this.sendToTicketScreen({startTime: startTime});
    }
  }

  showCurrentTicket() {
    this.distributionTicketApiService.getCurrentTicket().subscribe((response: TicketNumberResponse) => {
      this.sendToTicketScreen({ticketNumber: response.ticketNumber});
    });
  }

  showNextTicket() {
    this.distributionTicketApiService.getNextTicket().subscribe((response: TicketNumberResponse) => {
      this.sendToTicketScreen({ticketNumber: response.ticketNumber});
    });
  }

  private sendToTicketScreen(message: TicketScreenMessage) {
    this.websocketService.publish({destination: '/topic/ticket-screen', body: JSON.stringify(message)});
  }

}
