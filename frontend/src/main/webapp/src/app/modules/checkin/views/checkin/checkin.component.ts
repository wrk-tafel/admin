import {Component, computed, DestroyRef, effect, ElementRef, inject, signal, viewChild} from '@angular/core';
import {HttpContext, HttpErrorResponse} from '@angular/common/http';
import {CustomerApiService, CustomerData} from '../../../../api/customer-api.service';
import {Subscription} from 'rxjs';
import dayjs from 'dayjs';
import {CustomerNoteApiService, CustomerNoteItem} from '../../../../api/customer-note-api.service';
import {GlobalStateService} from '../../../../common/state/global-state.service';
import {Router} from '@angular/router';
import {DistributionApiService} from '../../../../api/distribution-api.service';
import {DistributionTicketApiService, TicketNumberResponse} from '../../../../api/distribution-ticket-api.service';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {CommonModule, DatePipe, NgClass} from '@angular/common';
import {TafelAutofocusDirective} from '../../../../common/directive/tafel-autofocus.directive';
import {SseService} from '../../../../common/sse/sse.service';
import {ScannerApiService, ScannerList} from '../../../../api/scanner-api.service';
import {GenderLabelPipe} from '../../../../common/pipes/gender-label.pipe';
import {BirthdateAgePipe} from '../../../../common/pipes/birthdate-age.pipe';
import {MatTabsModule} from '@angular/material/tabs';
import {MatCardModule} from '@angular/material/card';
import {MatButtonModule} from '@angular/material/button';
import {MatInputModule} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatDividerModule} from '@angular/material/divider';
import {MatOption, MatSelect} from '@angular/material/select';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faTrashCan} from '@fortawesome/free-solid-svg-icons';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {extractErrorMessage} from '../../../../common/api/problem-detail';
import {SUPPRESS_ERROR_TOAST} from '../../../../common/http/suppress-error-toast.token';

@Component({
    selector: 'tafel-checkin',
    templateUrl: 'checkin.component.html',
  imports: [
    FormsModule,
    CommonModule,
    ReactiveFormsModule,
    DatePipe,
    NgClass,
    TafelAutofocusDirective,
    GenderLabelPipe,
    BirthdateAgePipe,
    MatTabsModule,
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatDividerModule,
    MatSelect,
    MatOption,
    FaIconComponent,
  ]
})
export class CheckinComponent {
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

    return customer.additionalPersons.filter((person) => dayjs().diff(person.birthDate, 'years') < 3).length;
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
      this.scannerSubscription = this.sseService.listen<ScanResult>(`/sse/scanners/${scannerId}/results`)
        .subscribe((result: ScanResult) => {
          this.customerId.set(result.value);
          this.searchForCustomerId();
        });

      this.scannerReadyState.set(true);
    }
  }

  get scannerReadyStateColor(): string {
    return this.scannerReadyState() ? 'success' : 'danger';
  }

  readonly currentDistribution = this.globalStateService.getCurrentDistribution();
  readonly connectionState = this.globalStateService.getConnectionState();

  constructor() {
    // Redirect to overview if no distribution is active (only after SSE connection is established)
    effect(() => {
      if (this.connectionState() && this.currentDistribution() === null) {
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
    const observer = {
      next: (customerData: CustomerData) => {
        this.processCustomer(customerData);

        this.customerNoteApiService.getNotesForCustomer(this.customerId()!).subscribe(notesResponse => {
          this.customerNotes.set(notesResponse.items);
        });

        this.distributionTicketApiService.getCurrentTicketForCustomer(customerData.id!)
          .subscribe((ticketNumberResponse: TicketNumberResponse) => {
            if (ticketNumberResponse.ticketNumber) {
              this.ticketNumber.set(ticketNumberResponse.ticketNumber);
            }
            this.ticketNumberEdit.set(this.ticketNumber() != null);
          });
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 404) {
          this.processCustomer(undefined);
          this.customerNotes.set([]);
          this.toastr.info(`Kunde ${this.customerId()} nicht gefunden!`);
        } else {
          this.toastr.error(extractErrorMessage(error), 'Fehler beim Laden des Kunden!');
        }
      },
    };

    if (this.customerId()) {
      const context = new HttpContext().set(SUPPRESS_ERROR_TOAST, true);
      this.customerApiService.getCustomer(this.customerId()!, context).subscribe(observer);
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
    if (ticketNumber !== undefined && ticketNumber > 0) {

      const observer = {
        next: (_response: void) => this.cancel()
      };
      this.distributionApiService.assignCustomer(this.customer()!.id!, ticketNumber).subscribe(observer);
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

  protected readonly faTrashCan = faTrashCan;
}

export enum CustomerState {
  LOCKED, INVALID, VALID_WARN, VALID
}

export interface ScanResult {
  value: number;
}
