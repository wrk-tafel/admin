import {Component, inject, signal} from '@angular/core';
import {ReactiveFormsModule} from '@angular/forms';
import {TicketScreenComponent} from '../../components/ticket-screen/ticket-screen.component';
import {UrlHelperService} from '../../../../common/util/url-helper.service';
import {ButtonDirective, CardBodyComponent, CardComponent, ColComponent, RowComponent} from '@coreui/angular';
import {NgClass} from '@angular/common';
import {DistributionTicketScreenApiService} from '../../../../api/distribution-ticket-screen-api.service';
import {ToastService, ToastType} from '../../../../common/components/toasts/toast.service';
import {finalize} from 'rxjs';
import {form, FormField, required} from '@angular/forms/signals';
import {GlobalStateService} from "../../../../common/state/global-state.service";

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
    ButtonDirective,
    FormField
  ]
})
export class TicketScreenControlComponent {
  private readonly distributionTicketScreenApiService = inject(DistributionTicketScreenApiService);
  private readonly urlHelperService = inject(UrlHelperService);
  private readonly toastService = inject(ToastService);
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
            this.toastService.showToast({
              type: ToastType.ERROR,
              title: 'Fehler beim Anzeigen der Startzeit!'
            });
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
          this.toastService.showToast({
            type: ToastType.ERROR,
            title: 'Fehler beim Anzeigen des aktuellen Tickets!'
          });
        }
      });
  }

  showPreviousTicket() {
    this.isShowingPreviousTicket.set(true);
    this.distributionTicketScreenApiService.showPreviousTicket()
      .pipe(finalize(() => this.isShowingPreviousTicket.set(false)))
      .subscribe({
        error: () => {
          this.toastService.showToast({
            type: ToastType.ERROR,
            title: 'Fehler beim Anzeigen des vorherigen Tickets!'
          });
        }
      });
  }

  showNextTicket(costContributionPaid: boolean) {
    this.isShowingNextTicket.set(true);
    this.distributionTicketScreenApiService.showNextTicket(costContributionPaid)
      .pipe(finalize(() => this.isShowingNextTicket.set(false)))
      .subscribe({
        error: () => {
          this.toastService.showToast({
            type: ToastType.ERROR,
            title: 'Fehler beim Anzeigen des nächsten Tickets!'
          });
        }
      });
  }

}
