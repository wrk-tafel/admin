import {Component, computed, HostListener, inject, signal, viewChild} from '@angular/core';
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
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {MatIcon} from '@angular/material/icon';
import {MatTooltipModule} from '@angular/material/tooltip';
import {registerSvgIcons} from '../../../../common/util/svg-icon.util';
import checkIcon from '@material-symbols/svg-400/outlined/check-fill.svg';
import chevronLeftIcon from '@material-symbols/svg-400/outlined/chevron_left-fill.svg';
import chevronRightIcon from '@material-symbols/svg-400/outlined/chevron_right-fill.svg';
import euroIcon from '@material-symbols/svg-400/outlined/euro-fill.svg';
import linkIcon from '@material-symbols/svg-400/outlined/link-fill.svg';
import linkOffIcon from '@material-symbols/svg-400/outlined/link_off-fill.svg';
import closeIcon from '@material-symbols/svg-400/outlined/close-fill.svg';
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

/** What the public monitor is currently showing - kept in sync with the segmented control. */
type MonitorMode = 'startTime' | 'current';

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
    CurrencyPipe,
    MatButtonToggleModule,
    MatTooltipModule,
    MatIcon
  ]
})
export class TicketScreenControlComponent {
  private readonly registerIcons = registerSvgIcons({
    check: checkIcon,
    chevron_left: chevronLeftIcon,
    chevron_right: chevronRightIcon,
    euro: euroIcon,
    link: linkIcon,
    link_off: linkOffIcon,
    close: closeIcon
  });

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

  /** Which segment of "Monitor zeigt" is active - the segmented control mirrors this. */
  monitorMode = signal<MonitorMode>('current');

  /** How many tickets the back arrow has reopened without them being re-closed yet. The forward
   *  arrow re-closes one of exactly these (keeping its recorded paid/unpaid decision), so it is
   *  enabled only while this is > 0 - advancing past that point is a new decision and belongs to
   *  the "Weiter" buttons. Any successful advance (arrow or "Weiter") consumes one step. */
  stepsBack = signal(0);

  /** How many households are still waiting, derived from the counts the backend already returns
   *  alongside the ticket - `null` while there is nothing to show (no active distribution). */
  readonly queueRemaining = computed(() => {
    const ticket = this.currentTicket();
    if (ticket?.totalTicketsCount == null || ticket?.processedTicketsCount == null) {
      return null;
    }
    return ticket.totalTicketsCount - ticket.processedTicketsCount;
  });

  private readonly ticketScreenPreview = viewChild(TicketScreenComponent);
  /** The live-preview miniature's own SSE connection state, for its "Monitor verbunden/getrennt" badge. */
  readonly previewConnected = computed(() => this.ticketScreenPreview()?.connected() ?? true);


  constructor() {
    // Populate the current-ticket card and cost-contribution panel for whichever ticket is already
    // current (e.g. after a page reload) - via the read-only fetch, never show-current: a broadcast
    // here would put "Ticket" on the public monitor just because this page was (re)loaded,
    // overwriting e.g. a start time the monitor is showing.
    this.distributionTicketScreenApiService.getCurrentTicket().subscribe({
      next: (response) => this.currentTicket.set(response),
      error: () => {
        this.toastr.error('Fehler beim Laden des aktuellen Tickets!');
      }
    });
  }

  /**
   * Keyboard shortcuts for the loop this screen exists for: Enter = "Weiter (bezahlt)",
   * N = "Weiter (nicht bezahlt)" (see the on-screen legend next to the buttons). Ignored while a
   * form field has focus (so typing the start time or an amount in a dialog isn't hijacked) or
   * while a dialog is open, and gated by the same conditions as the buttons themselves.
   */
  @HostListener('document:keydown', ['$event'])
  handleKeyboardShortcut(event: KeyboardEvent) {
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }
    const target = event.target as HTMLElement | null;
    if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
      return;
    }
    if (this.dialog.openDialogs.length > 0) {
      return;
    }
    if (this.isShowingNextTicket() || this.currentDistribution() === null) {
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      this.showNextTicket(true);
    } else if (event.key === 'n' || event.key === 'N') {
      event.preventDefault();
      this.showNextTicket(false);
    }
  }

  /** Switches the segmented control to "Startzeit" without showing anything yet - the time still
   *  has to be entered and confirmed via "Anzeigen" (or Enter in the field). */
  selectStartTimeMode() {
    this.monitorMode.set('startTime');
  }

  openScreenInNewTab() {
    const baseUrl = this.urlHelperService.getBaseUrl();
    window.open(`${baseUrl}/anmeldung/ticketmonitor`, '_blank');
  }

  showStartTime() {
    this.startTimeForm.startTime().markAsTouched();

    const time = this.startTimeForm.startTime().value();
    if (time && !this.isShowingStartTime()) {
      this.isShowingStartTime.set(true);
      this.distributionTicketScreenApiService.showText('Startzeit', time)
        .pipe(finalize(() => this.isShowingStartTime.set(false)))
        .subscribe({
          next: () => this.monitorMode.set('startTime'),
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
        next: (response) => {
          this.currentTicket.set(response);
          this.monitorMode.set('current');
        },
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
        next: (response) => {
          this.currentTicket.set(response);
          // The reopened ticket *is* the current one again, so the monitor keeps showing
          // "Aktuelles Ticket" - going back is queue navigation, not a display mode.
          this.monitorMode.set('current');
          this.stepsBack.update(steps => steps + 1);
        },
        error: () => {
          this.toastr.error('Fehler beim Anzeigen des vorherigen Tickets!');
        }
      });
  }

  /** The forward arrow: re-close the reopened current ticket with the paid/unpaid decision it was
   *  originally processed with (see `stepsBack`), and show the next one. */
  showNextTicketAgain() {
    this.advanceTicket(null);
  }

  showNextTicket(costContributionPaid: boolean) {
    this.advanceTicket(costContributionPaid);
  }

  private advanceTicket(costContributionPaid: boolean | null) {
    if (this.isShowingNextTicket()) {
      return;
    }
    this.isShowingNextTicket.set(true);
    this.distributionTicketScreenApiService.showNextTicket(costContributionPaid)
      .pipe(finalize(() => this.isShowingNextTicket.set(false)))
      .subscribe({
        next: (response) => {
          this.currentTicket.set(response);
          this.monitorMode.set('current');
          this.stepsBack.update(steps => Math.max(0, steps - 1));
        },
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
