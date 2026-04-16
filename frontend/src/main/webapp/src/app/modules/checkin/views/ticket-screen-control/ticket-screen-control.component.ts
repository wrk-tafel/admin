import {Component, inject, signal} from '@angular/core';
import {ReactiveFormsModule} from '@angular/forms';
import {TicketScreenComponent} from '../../components/ticket-screen/ticket-screen.component';
import {UrlHelperService} from '../../../../common/util/url-helper.service';
import {NgClass} from '@angular/common';
import {DistributionTicketScreenApiService} from '../../../../api/distribution-ticket-screen-api.service';
import {ToastrService} from 'ngx-toastr';
import {finalize} from 'rxjs';
import {form, FormField, required} from '@angular/forms/signals';
import {GlobalStateService} from '../../../../common/state/global-state.service';
import {MatCardModule} from '@angular/material/card';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatDivider} from '@angular/material/list';

@Component({
  selector: 'tafel-ticket-screen-control',
  templateUrl: 'ticket-screen-control.component.html',
  imports: [
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    TicketScreenComponent,
    FormField,
    MatDivider
  ]
})
export class TicketScreenControlComponent {
  private readonly distributionTicketScreenApiService = inject(DistributionTicketScreenApiService);
  private readonly urlHelperService = inject(UrlHelperService);
  private readonly toastr = inject(ToastrService);
  private readonly globalStateService = inject(GlobalStateService);

  startTimeFormModel = signal({
    startTime: '',
  });
  startTimeForm = form(this.startTimeFormModel, (schemaPath) => {
    required(schemaPath.startTime);
  });

  // Loading states to prevent double-clicks
  isShowingStartTime = signal(false);
  isShowingCurrentTicket = signal(false);
  isShowingPreviousTicket = signal(false);
  isShowingNextTicket = signal(false);
  currentDistribution = this.globalStateService.getCurrentDistribution();

  openScreenInNewTab() {
    const baseUrl = this.urlHelperService.getBaseUrl();
    window.open(`${baseUrl}/#/anmeldung/ticketmonitor`, '_blank');
  }

  showStartTime() {
    this.startTimeForm.startTime().markAsTouched();

    const time = this.startTimeForm.startTime().value();
    if (time) {
      this.isShowingStartTime.set(true);
      this.distributionTicketScreenApiService.showText('Startzeit', time)
        .pipe(finalize(() => this.isShowingStartTime.set(false)))
        .subscribe({
          error: () => {
            this.toastr.error('Fehler beim Anzeigen der Startzeit!');
          }
        });
    }
  }

  showCurrentTicket() {
    this.isShowingCurrentTicket.set(true);
    this.distributionTicketScreenApiService.showCurrentTicket()
      .pipe(finalize(() => this.isShowingCurrentTicket.set(false)))
      .subscribe({
        error: () => {
          this.toastr.error('Fehler beim Anzeigen des aktuellen Tickets!');
        }
      });
  }

  showPreviousTicket() {
    this.isShowingPreviousTicket.set(true);
    this.distributionTicketScreenApiService.showPreviousTicket()
      .pipe(finalize(() => this.isShowingPreviousTicket.set(false)))
      .subscribe({
        error: () => {
          this.toastr.error('Fehler beim Anzeigen des vorherigen Tickets!');
        }
      });
  }

  showNextTicket(costContributionPaid: boolean) {
    this.isShowingNextTicket.set(true);
    this.distributionTicketScreenApiService.showNextTicket(costContributionPaid)
      .pipe(finalize(() => this.isShowingNextTicket.set(false)))
      .subscribe({
        error: () => {
          this.toastr.error('Fehler beim Anzeigen des nächsten Tickets!');
        }
      });
  }

}
