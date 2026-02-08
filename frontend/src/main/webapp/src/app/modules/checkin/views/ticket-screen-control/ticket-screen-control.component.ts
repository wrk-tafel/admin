import {Component, inject} from '@angular/core';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {TicketScreenComponent} from '../../components/ticket-screen/ticket-screen.component';
import {UrlHelperService} from '../../../../common/util/url-helper.service';
import {ButtonDirective, CardBodyComponent, CardComponent, ColComponent, RowComponent} from '@coreui/angular';
import {NgClass} from '@angular/common';
import {DistributionTicketScreenApiService} from '../../../../api/distribution-ticket-screen-api.service';

@Component({
    selector: 'tafel-ticket-screen-control',
    templateUrl: 'ticket-screen-control.component.html',
    imports: [
        CardComponent,
        CardBodyComponent,
        RowComponent,
        ColComponent,
        ReactiveFormsModule,
        NgClass,
        TicketScreenComponent,
        ButtonDirective
    ]
})
export class TicketScreenControlComponent {
  private readonly distributionTicketScreenApiService = inject(DistributionTicketScreenApiService);
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
      // TODO error toast?
      this.distributionTicketScreenApiService.showText('Startzeit', time).subscribe()
    }
  }

  showCurrentTicket() {
    // TODO error toast?
    this.distributionTicketScreenApiService.showCurrentTicket().subscribe();
  }

  showNextTicket() {
    // TODO error toast?
    this.distributionTicketScreenApiService.showNextTicket().subscribe();
  }

  get startTime() {
    return this.form.get('startTime');
  }

}
