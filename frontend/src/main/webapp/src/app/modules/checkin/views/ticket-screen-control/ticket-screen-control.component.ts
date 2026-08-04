import {Component, inject, signal} from '@angular/core';
import {ReactiveFormsModule} from '@angular/forms';
import {CurrencyPipe} from '@angular/common';
import {TicketScreenComponent} from '../../components/ticket-screen/ticket-screen.component';
import {UrlHelperService} from '../../../../common/util/url-helper.service';
import {
  DistributionTicketScreenApiService,
  TicketScreenTicketResponse
} from '../../../../api/distribution-ticket-screen-api.service';
import {finalize} from 'rxjs';
import {form, FormField, required} from '@angular/forms/signals';
import {GlobalStateService} from '../../../../common/state/global-state.service';
import {MatCardModule} from '@angular/material/card';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatDivider} from '@angular/material/list';
import {MatDialog} from '@angular/material/dialog';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {CustomerApiService} from '../../../../api/customer-api.service';
import {HttpErrorResponse} from '@angular/common/http';
import {extractErrorMessage} from '../../../../common/api/problem-detail';
import {
  PayCostContributionDialogComponent
} from '../../../../common/components/pay-cost-contribution-dialog/pay-cost-contribution-dialog.component';
import {
  EditCostContributionDialogComponent
} from '../../../../common/components/edit-cost-contribution-dialog/edit-cost-contribution-dialog.component';

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
    MatDivider,
    CurrencyPipe
  ]
})
export class TicketScreenControlComponent {
  private readonly distributionTicketScreenApiService = inject(DistributionTicketScreenApiService);
  private readonly urlHelperService = inject(UrlHelperService);
  private readonly toastr = inject(TafelToastrService);
  private readonly globalStateService = inject(GlobalStateService);
  private readonly customerApiService = inject(CustomerApiService);
  private readonly dialog = inject(MatDialog);

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

  currentTicket = signal<TicketScreenTicketResponse | null>(null);

  constructor() {
    // Populate the cost-contribution panel for whichever ticket is already current (e.g. after a
    // page reload) instead of leaving it empty until the operator clicks "Aktuelles Ticket".
    this.showCurrentTicket();
  }

  openScreenInNewTab() {
    const baseUrl = this.urlHelperService.getBaseUrl();
    window.open(`${baseUrl}/#/anmeldung/ticketmonitor`, '_blank');
  }

  showStartTime() {
    this.startTimeForm.startTime().markAsTouched();

    const time = this.startTimeForm.startTime().value();
    if (time && !this.isShowingStartTime()) {
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
    if (this.isShowingCurrentTicket()) {
      return;
    }
    this.isShowingCurrentTicket.set(true);
    this.distributionTicketScreenApiService.showCurrentTicket()
      .pipe(finalize(() => this.isShowingCurrentTicket.set(false)))
      .subscribe({
        next: (response) => this.currentTicket.set(response),
        error: () => {
          this.toastr.error('Fehler beim Anzeigen des aktuellen Tickets!');
        }
      });
  }

  showPreviousTicket() {
    if (this.isShowingPreviousTicket()) {
      return;
    }
    this.isShowingPreviousTicket.set(true);
    this.distributionTicketScreenApiService.showPreviousTicket()
      .pipe(finalize(() => this.isShowingPreviousTicket.set(false)))
      .subscribe({
        next: (response) => this.currentTicket.set(response),
        error: () => {
          this.toastr.error('Fehler beim Anzeigen des vorherigen Tickets!');
        }
      });
  }

  showNextTicket(costContributionPaid: boolean) {
    if (this.isShowingNextTicket()) {
      return;
    }
    this.isShowingNextTicket.set(true);
    this.distributionTicketScreenApiService.showNextTicket(costContributionPaid)
      .pipe(finalize(() => this.isShowingNextTicket.set(false)))
      .subscribe({
        next: (response) => this.currentTicket.set(response),
        error: () => {
          this.toastr.error('Fehler beim Anzeigen des nächsten Tickets!');
        }
      });
  }

  openPayCostContributionDialog() {
    this.dialog.open(PayCostContributionDialogComponent, {
      data: {pendingAmount: this.currentTicket()?.pendingCostContribution ?? 0}
    }).afterClosed().subscribe(amount => {
      if (amount) {
        this.payCostContribution(amount);
      }
    });
  }

  payCostContributionAll() {
    this.payCostContribution(undefined);
  }

  private payCostContribution(amount: number | undefined) {
    this.customerApiService.payCostContribution(this.currentTicket()!.householdId!, amount).subscribe({
      next: (customer) => {
        this.currentTicket.update(ticket => ticket && ({...ticket, pendingCostContribution: customer.pendingCostContribution ?? 0}));
        this.toastr.success('Unkostenbeitrag wurde aktualisiert!');
      },
      error: (error: HttpErrorResponse) => {
        this.toastr.error(extractErrorMessage(error), 'Aktualisierung fehlgeschlagen!');
      }
    });
  }

  openEditCostContributionDialog() {
    this.dialog.open(EditCostContributionDialogComponent, {
      data: {pendingAmount: this.currentTicket()?.pendingCostContribution ?? 0}
    }).afterClosed().subscribe(amount => {
      if (amount !== undefined && amount !== null) {
        this.editCostContribution(amount);
      }
    });
  }

  private editCostContribution(amount: number) {
    this.customerApiService.editCostContribution(this.currentTicket()!.householdId!, amount).subscribe({
      next: (customer) => {
        this.currentTicket.update(ticket => ticket && ({...ticket, pendingCostContribution: customer.pendingCostContribution ?? 0}));
        this.toastr.success('Unkostenbeitrag wurde aktualisiert!');
      },
      error: (error: HttpErrorResponse) => {
        this.toastr.error(extractErrorMessage(error), 'Aktualisierung fehlgeschlagen!');
      }
    });
  }

}
