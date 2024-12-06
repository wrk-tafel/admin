import {Component, inject} from '@angular/core';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {WebsocketService} from '../../../common/websocket/websocket.service';
import {TicketScreenComponent, TicketScreenMessage} from '../ticket-screen/ticket-screen.component';
import {DistributionTicketApiService, TicketNumberResponse} from '../../../api/distribution-ticket-api.service';
import {UrlHelperService} from '../../../common/util/url-helper.service';
import {ButtonDirective, CardBodyComponent, CardComponent, ColComponent, RowComponent} from '@coreui/angular';
import {CommonModule} from "@angular/common";

@Component({
  selector: 'tafel-ticket-screen-control',
  templateUrl: 'ticket-screen-control.component.html',
  standalone: true,
  imports: [
    CardComponent,
    CardBodyComponent,
    RowComponent,
    ColComponent,
    ReactiveFormsModule,
    CommonModule,
    TicketScreenComponent,
    ButtonDirective
  ]
})
export class TicketScreenControlComponent {
  private readonly websocketService = inject(WebsocketService);
  private readonly distributionTicketApiService = inject(DistributionTicketApiService);
  private readonly urlHelperService = inject(UrlHelperService);
  private readonly fb = inject(FormBuilder);

  form = this.fb.group({
    startTime: this.fb.control<string>(null, Validators.required)
  });

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

  get startTime() {
    return this.form.get('startTime');
  }

}
