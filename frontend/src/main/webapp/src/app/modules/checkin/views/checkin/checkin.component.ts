import {Component, computed, DestroyRef, effect, ElementRef, inject, signal, viewChild} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {HttpErrorResponse} from '@angular/common/http';
import {CustomerApiService, CustomerData} from '../../../../api/customer-api.service';
import {catchError, EMPTY, forkJoin, Subject, Subscription, switchMap} from 'rxjs';
import dayjs from 'dayjs';
import {CustomerNoteApiService, CustomerNoteItem} from '../../../../api/customer-note-api.service';
import {GlobalStateService} from '../../../../common/state/global-state.service';
import {Router} from '@angular/router';
import {DistributionApiService} from '../../../../api/distribution-api.service';
import {DistributionTicketApiService} from '../../../../api/distribution-ticket-api.service';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {CommonModule, DatePipe, NgClass} from '@angular/common';
import {TafelAutofocusDirective} from '../../../../common/directive/tafel-autofocus.directive';
import {SseService} from '../../../../common/sse/sse.service';
import {ScannerApiService, ScannerList} from '../../../../api/scanner-api.service';
import {GenderLabelPipe} from '../../../../common/pipes/gender-label.pipe';
import {BirthdateAgePipe} from '../../../../common/pipes/birthdate-age.pipe';
import {MatCardModule} from '@angular/material/card';
import {MatButtonModule} from '@angular/material/button';
import {MatInputModule} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatDividerModule} from '@angular/material/divider';
import {MatOption, MatSelect} from '@angular/material/select';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatIcon} from '@angular/material/icon';
import {registerSvgIcons} from '../../../../common/util/svg-icon.util';
import stickyNote2Icon from '@material-symbols/svg-400/outlined/sticky_note_2-fill.svg';
import restartAltIcon from '@material-symbols/svg-400/outlined/restart_alt-fill.svg';
import deleteIcon from '@material-symbols/svg-400/outlined/delete-fill.svg';
import warningIcon from '@material-symbols/svg-400/outlined/warning-fill.svg';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {extractErrorMessage} from '../../../../common/api/problem-detail';
import {SUPPRESS_ERROR_TOAST_CONTEXT} from '../../../../common/http/suppress-error-toast.token';

@Component({
    selector: 'tafel-checkin',
    templateUrl: 'checkin.component.html',
    // The shell's <main> is a flex column - joining it lets the card chain in the template
    // stretch to the bottom of the viewport (see the comment on the root mat-card)
    host: {class: 'flex flex-col grow'},
  imports: [
    FormsModule,
    CommonModule,
    ReactiveFormsModule,
    DatePipe,
    NgClass,
    TafelAutofocusDirective,
    GenderLabelPipe,
    BirthdateAgePipe,
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatDividerModule,
    MatSelect,
    MatOption,
    MatIcon,
    MatTooltipModule
  ]
})
export class CheckinComponent {
  private readonly registerIcons = registerSvgIcons({
    sticky_note_2: stickyNote2Icon,
    restart_alt: restartAltIcon,
    delete: deleteIcon,
    warning: warningIcon
  });

  private readonly customerApiService = inject(CustomerApiService);
  private readonly customerNoteApiService = inject(CustomerNoteApiService);
  private readonly globalStateService = inject(GlobalStateService);
  private readonly distributionApiService = inject(DistributionApiService);
  private readonly distributionTicketApiService = inject(DistributionTicketApiService);
  private readonly scannerApiService = inject(ScannerApiService);
  private readonly sseService = inject(SseService);
  private readonly router = inject(Router);
  private readonly toastr = inject(TafelToastrService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly VALID_UNTIL_WARNLIMIT_WEEKS = 8;

  customerIdInputRef = viewChild<ElementRef>('customerIdInput');
  ticketNumberInputRef = viewChild<ElementRef>('ticketNumberInput');
  cancelButtonRef = viewChild<ElementRef>('cancelButton');

  scannerIds = signal<number[]>([]);
  currentScannerId = signal<number | undefined>(undefined);
  scannerReadyState = signal<boolean | undefined>(undefined);
  scannerSubscription: Subscription | undefined;
  customerId = signal<number | undefined>(undefined);
  customer = signal<CustomerData | undefined>(undefined);
  customerState = signal<CustomerState | undefined>(undefined);
  customerNotes = signal<CustomerNoteItem[] | undefined>(undefined);
  ticketNumber = signal<number | undefined>(undefined);
  ticketNumberEdit = signal<boolean | undefined>(false);
  lastAcceptedCheckin = signal<LastAcceptedCheckin | undefined>(undefined);

  customerStateColor = computed<string | null>(() => {
    switch (this.customerState()) {
      case CustomerState.LOCKED:
      case CustomerState.INVALID:
        return 'danger';
      case CustomerState.VALID_WARN:
        return 'warning';
      case CustomerState.VALID:
        return 'success';
      default:
        return null;
    }
  });

  customerStateText = computed<string | null>(() => {
    switch (this.customerState()) {
      case CustomerState.LOCKED:
        return 'GESPERRT';
      case CustomerState.INVALID:
        return 'UNGÜLTIG';
      case CustomerState.VALID_WARN:
        return 'GÜLTIG - läuft bald ab';
      case CustomerState.VALID:
        return 'GÜLTIG';
      default:
        return null;
    }
  });

  // The decisive fact next to the big verdict word in the banner - "seit" for an already-expired
  // validity, "bis" for one that's still running (whether or not it's about to end). Null for
  // LOCKED, whose decisive fact is the lock reason (see the template) rather than a date.
  customerStateDatePrefix = computed<string | null>(() => {
    switch (this.customerState()) {
      case CustomerState.INVALID:
        return 'seit';
      case CustomerState.VALID_WARN:
      case CustomerState.VALID:
        return 'bis';
      default:
        return null;
    }
  });

  // Persons flagged excludeFromHousehold don't count - same rule as the backend's household-list
  // and statistics counting (see DistributionService.mapHouseholdsForPdf)
  householdSize = computed<number>(() =>
    (this.customer()?.additionalPersons?.filter((person) => !person.excludeFromHousehold)?.length ?? 0) + 1);

  formattedName = computed<string | undefined>(() => {
    const customer = this.customer();
    if (customer) {
      const formatted = [customer.lastname, customer.firstname].join(' ');
      return formatted?.trim().length > 0 ? formatted : undefined;
    }
    return undefined;
  });

  formattedAddress = computed<string | undefined>(() => {
    const customer = this.customer();
    if (customer) {
      const formatted = [
        [customer.address.street, customer.address.houseNumber].join(' '),
        customer.address.stairway ? 'Stiege ' + customer.address.stairway : undefined,
        customer.address.door ? 'Top ' + customer.address.door : undefined,
        [customer.address.postalCode, customer.address.city].join(' ')
      ]
        .filter(value => (value?.trim().length ?? 0) > 0)
        .join(', ');
      return formatted?.trim().length > 0 ? formatted : '-';
    }
    return undefined;
  });

  infantCount = computed<number>(() => {
    const customer = this.customer();
    if (!customer || !customer.additionalPersons) {
      return 0;
    }

    return customer.additionalPersons
      .filter((person) => !person.excludeFromHousehold)
      .filter((person) => dayjs().diff(person.birthDate, 'years') < 3).length;
  });

  trackByScannerId(scannerId: number) {
    return scannerId;
  }

  get selectedScannerId(): number | undefined {
    return this.currentScannerId();
  }

  set selectedScannerId(scannerId: number | undefined) {
    this.currentScannerId.set(scannerId);
    if (this.scannerSubscription) {
      this.scannerSubscription.unsubscribe();
    }
    this.scannerReadyState.set(false);

    if (scannerId) {
      this.scannerSubscription = this.sseService
        .listen<ScanResult>(`/sse/scanners/${scannerId}/results`, (connected) => this.scannerReadyState.set(connected))
        .subscribe((result: ScanResult) => {
          this.customerId.set(result.value);
          this.searchForCustomerId();
        });
    }
  }

  get scannerReadyStateColor(): string {
    return this.scannerReadyState() ? 'success' : 'danger';
  }

  readonly currentDistribution = this.globalStateService.getCurrentDistribution();
  readonly hasReceivedDistribution = this.globalStateService.getHasReceivedDistribution();

  // A scan can come in while the previous customer's lookup is still in flight (typing then a
  // scan, or two scans back to back) - routing every search through this switchMap cancels a
  // still-pending older search (customer + notes + ticket, all of it) the moment a newer one
  // starts, so a slower earlier lookup can never overwrite what a faster later one just loaded.
  private readonly customerSearchTrigger = new Subject<number>();

  constructor() {
    this.customerSearchTrigger.pipe(
      switchMap(customerId => this.customerApiService.getCustomer(customerId, SUPPRESS_ERROR_TOAST_CONTEXT).pipe(
        switchMap(customerData => {
          this.processCustomer(customerData);

          return forkJoin({
            notes: this.customerNoteApiService.getNotesForCustomer(customerData.id!),
            ticket: this.distributionTicketApiService.getCurrentTicketForCustomer(customerData.id!)
          });
        }),
        catchError((error: HttpErrorResponse) => {
          if (error.status === 404) {
            this.processCustomer(undefined);
            this.customerNotes.set([]);
            this.toastr.warning(`Kunde ${customerId} nicht gefunden!`);
          } else {
            this.toastr.error(extractErrorMessage(error), 'Fehler beim Laden des Kunden!');
          }
          return EMPTY;
        })
      )),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(({notes, ticket}) => {
      this.customerNotes.set(notes.items);
      if (ticket.ticketNumber) {
        this.ticketNumber.set(ticket.ticketNumber);
      }
      this.ticketNumberEdit.set(this.ticketNumber() != null);
    });

    // Redirect to overview once it's confirmed no distribution is active (only after the first
    // SSE message has actually been processed - see getHasReceivedDistribution's doc comment on
    // why the raw connection state isn't enough here).
    effect(() => {
      if (this.hasReceivedDistribution() && this.currentDistribution() === null) {
        this.router.navigate(['uebersicht']);
      }
    });

    // Load scanners on init
    effect(() => {
      this.scannerApiService.getScanners().subscribe((response: ScannerList) => {
        this.scannerIds.set(response.scannerIds);
      });
    });

    // Register cleanup for scanner subscription
    this.destroyRef.onDestroy(() => {
      if (this.scannerSubscription) {
        this.scannerSubscription.unsubscribe();
      }
    });
  }

  searchForCustomerId() {
    if (this.customerId()) {
      this.customerSearchTrigger.next(this.customerId()!);
    } else {
      this.toastr.warning('Keine Kundennummer angegeben!');
    }
  }

  processCustomer(customer: CustomerData | undefined) {
    this.ticketNumber.set(undefined);
    this.customer.set(customer);

    if (customer) {
      const validUntil = dayjs(customer.validUntil).startOf('day');
      const now = dayjs().startOf('day');

      if (customer.locked) {
        this.customerState.set(CustomerState.LOCKED);
        setTimeout(() => this.cancelButtonRef()?.nativeElement?.focus?.());
      } else if (validUntil.isBefore(now)) {
        this.customerState.set(CustomerState.INVALID);
        setTimeout(() => this.cancelButtonRef()?.nativeElement?.focus?.());
      } else {
        const warnLimit = now.add(this.VALID_UNTIL_WARNLIMIT_WEEKS, 'weeks');
        if (!validUntil.isAfter(warnLimit)) {
          this.customerState.set(CustomerState.VALID_WARN);
        } else {
          this.customerState.set(CustomerState.VALID);
        }

        setTimeout(() => this.ticketNumberInputRef()?.nativeElement?.focus?.());
      }
    } else {
      this.customerState.set(undefined);
    }
  }

  cancel() {
    this.processCustomer(undefined);
    this.customerNotes.set([]);
    this.customerId.set(undefined);
    this.ticketNumber.set(undefined);
    this.ticketNumberEdit.set(undefined);
    this.customerIdInputRef()?.nativeElement?.focus?.();
  }

  assignCustomer() {
    const ticketNumber = this.ticketNumber();
    const customerId = this.customer()?.id;
    if (ticketNumber !== undefined && ticketNumber > 0 && customerId !== undefined) {

      const observer = {
        next: (_response: void) => {
          this.lastAcceptedCheckin.set({customerId, ticketNumber});
          this.showUndoToast(customerId, ticketNumber);
          this.cancel();
        }
      };
      this.distributionApiService.assignCustomer(customerId, ticketNumber).subscribe(observer);
      this.customerIdInputRef()?.nativeElement?.focus?.();
    }
  }

  deleteTicket() {
    const observer = {
      next: () => {
        this.ticketNumber.set(undefined);
        this.ticketNumberEdit.set(undefined);
        this.toastr.success('Ticket-Nummer gelöscht!');
        this.ticketNumberInputRef()?.nativeElement?.focus?.();
      }
    };
    this.distributionTicketApiService.deleteCurrentTicketOfCustomer(this.customer()!.id!).subscribe(observer);
  }

  /**
   * The delete-ticket API doubles as "undo the last check-in" - a mistyped ticket number is
   * otherwise only fixable by re-searching the customer. Available both from the confirmation
   * toast's action button and from the persistent "zuletzt angenommen" line, so it stays reachable
   * even after the toast has auto-dismissed and the operator has already moved on to the next
   * customer.
   */
  undoLastCheckin() {
    const last = this.lastAcceptedCheckin();
    if (!last) {
      return;
    }

    this.distributionTicketApiService.deleteCurrentTicketOfCustomer(last.customerId).subscribe(() => {
      this.lastAcceptedCheckin.set(undefined);
      this.toastr.success(`Ticket ${last.ticketNumber} von Kunde Nr. ${last.customerId} wurde rückgängig gemacht.`);
    });
  }

  private showUndoToast(customerId: number, ticketNumber: number) {
    const snackBarRef = this.toastr.success(
      `Kunde Nr. ${customerId} → Ticket ${ticketNumber} angenommen.`,
      undefined,
      {action: 'Rückgängig', durationMs: 8000}
    );
    snackBarRef.onAction().subscribe(() => this.undoLastCheckin());
  }

}

export enum CustomerState {
  LOCKED, INVALID, VALID_WARN, VALID
}

export interface ScanResult {
  value: number;
}

export interface LastAcceptedCheckin {
  customerId: number;
  ticketNumber: number;
}
