import {
  ChangeDetectorRef,
  Component,
  computed,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ViewChild
} from '@angular/core';
import {CustomerApiService, CustomerData} from '../../../../api/customer-api.service';
import {Subscription} from 'rxjs';
import moment from 'moment';
import {CustomerNoteApiService, CustomerNoteItem} from '../../../../api/customer-note-api.service';
import {GlobalStateService} from '../../../../common/state/global-state.service';
import {Router} from '@angular/router';
import {DistributionApiService} from '../../../../api/distribution-api.service';
import {
  BadgeComponent,
  ButtonDirective,
  CardBodyComponent,
  CardComponent,
  CardFooterComponent,
  CardHeaderComponent,
  ColComponent,
  Colors,
  FormCheckInputDirective,
  FormSelectDirective,
  RowComponent,
  TabDirective,
  TabPanelComponent,
  TabsComponent,
  TabsContentComponent,
  TabsListComponent
} from '@coreui/angular';
import {DistributionTicketApiService, TicketNumberResponse} from '../../../../api/distribution-ticket-api.service';
import {ToastService, ToastType} from '../../../../common/components/toasts/toast.service';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {CommonModule, DatePipe, NgClass} from '@angular/common';
import {TafelAutofocusDirective} from '../../../../common/directive/tafel-autofocus.directive';
import {SseService} from '../../../../common/sse/sse.service';
import {ScannerApiService, ScannerList} from '../../../../api/scanner-api.service';
import {GenderLabelPipe} from '../../../../common/pipes/gender-label.pipe';
import {BirthdateAgePipe} from '../../../../common/pipes/birthdate-age.pipe';

@Component({
    selector: 'tafel-checkin',
    templateUrl: 'checkin.component.html',
    imports: [
        RowComponent,
        ColComponent,
        CardComponent,
        CardBodyComponent,
        FormsModule,
        BadgeComponent,
        DatePipe,
        CardHeaderComponent,
        NgClass,
        CardFooterComponent,
        ButtonDirective,
        FormSelectDirective,
        CommonModule,
        TafelAutofocusDirective,
        FormCheckInputDirective,
        ReactiveFormsModule,
        TabDirective,
        TabPanelComponent,
        TabsComponent,
        TabsContentComponent,
        TabsListComponent,
        GenderLabelPipe,
        BirthdateAgePipe
    ]
})
export class CheckinComponent implements OnInit, OnDestroy {
  private readonly customerApiService = inject(CustomerApiService);
  private readonly customerNoteApiService = inject(CustomerNoteApiService);
  private readonly globalStateService = inject(GlobalStateService);
  private readonly distributionApiService = inject(DistributionApiService);
  private readonly distributionTicketApiService = inject(DistributionTicketApiService);
  private readonly scannerApiService = inject(ScannerApiService);
  private readonly sseService = inject(SseService);
  private readonly router = inject(Router);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly toastService = inject(ToastService);
  private readonly VALID_UNTIL_WARNLIMIT_WEEKS = 8;

  @ViewChild('customerIdInput') customerIdInputRef: ElementRef;
  @ViewChild('ticketNumberInput') ticketNumberInputRef: ElementRef;
  @ViewChild('cancelButton') cancelButtonRef: ElementRef;

  scannerIds: number[];
  currentScannerId: number;
  scannerReadyState: boolean;
  scannerSubscription: Subscription;
  customerId: number;
  customer = signal<CustomerData>(undefined);
  customerState = signal<CustomerState>(undefined);
  customerNotes: CustomerNoteItem[];
  ticketNumber: number;
  ticketNumberEdit = false;
  costContributionPaid: boolean = true;

  customerStateColor = computed<Colors>(() => {
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

  customerStateText = computed<string>(() => {
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

  formattedName = computed<string>(() => {
    const customer = this.customer();
    if (customer) {
      const formatted = [customer.lastname, customer.firstname].join(' ');
      return formatted?.trim().length > 0 ? formatted : undefined;
    }
    return undefined;
  });

  formattedAddress = computed<string>(() => {
    const customer = this.customer();
    if (customer) {
      const formatted = [
        [customer.address.street, customer.address.houseNumber].join(' '),
        customer.address.stairway ? 'Stiege ' + customer.address.stairway : undefined,
        customer.address.door ? 'Top ' + customer.address.door : undefined,
        [customer.address.postalCode, customer.address.city].join(' ')
      ]
        .filter(value => value?.trim().length > 0)
        .join(', ');
      return formatted?.trim().length > 0 ? formatted : '-';
    }
    return undefined;
  });

  infantCount = computed<number>(() => {
    const customer = this.customer();
    if (!customer) {
      return 0;
    }

    return customer.additionalPersons.filter((person) => moment().diff(person.birthDate, 'years') < 3).length;
  });

  trackByScannerId(scannerId: number) {
    return scannerId;
  }

  get selectedScannerId(): number {
    return this.currentScannerId;
  }

  set selectedScannerId(scannerId: number) {
    this.currentScannerId = scannerId;
    if (this.scannerSubscription) {
      this.scannerSubscription.unsubscribe();
    }
    this.scannerReadyState = false;

    if (scannerId) {
      this.scannerSubscription = this.sseService.listen<ScanResult>(`/sse/scanners/${this.currentScannerId}/results`)
        .subscribe((result: ScanResult) => {
          this.customerId = result.value;
          this.searchForCustomerId();
        });

      this.scannerReadyState = true;
    }
  }

  get scannerReadyStateColor(): Colors {
    return this.scannerReadyState ? 'success' : 'danger';
  }

  ngOnInit(): void {
    if (this.globalStateService.getCurrentDistribution().value === null) {
      this.router.navigate(['uebersicht']);
    }

    this.scannerApiService.getScanners().subscribe((response: ScannerList) => {
      this.scannerIds = response.scannerIds;
    });
  }

  ngOnDestroy(): void {
    if (this.scannerSubscription) {
      this.scannerSubscription.unsubscribe();
    }
  }

  searchForCustomerId() {
    const observer = {
      next: (customerData: CustomerData) => {
        this.processCustomer(customerData);

        this.customerNoteApiService.getNotesForCustomer(this.customerId).subscribe(notesResponse => {
          this.customerNotes = notesResponse.items;
        });

        this.distributionTicketApiService.getCurrentTicketForCustomer(customerData.id).subscribe((ticketNumberResponse: TicketNumberResponse) => {
          if (ticketNumberResponse.ticketNumber) {
            this.ticketNumber = ticketNumberResponse.ticketNumber;
            this.costContributionPaid = ticketNumberResponse.costContributionPaid;
          }
          this.ticketNumberEdit = this.ticketNumber != null;
        });
      },
      error: error => {
        if (error.status === 404) {
          this.processCustomer(undefined);
          this.customerNotes = [];
        }
      },
    };

    if (this.customerId) {
      this.customerApiService.getCustomer(this.customerId).subscribe(observer);
    } else {
      this.toastService.showToast({type: ToastType.WARN, title: undefined, message: 'Keine Kundennummer angegeben!'});
    }
  }

  processCustomer(customer: CustomerData) {
    this.ticketNumber = undefined;
    this.costContributionPaid = true;
    this.customer.set(customer);

    if (customer) {
      const validUntil = moment(customer.validUntil).startOf('day');
      const now = moment().startOf('day');

      if (customer.locked) {
        this.customerState.set(CustomerState.LOCKED);
        this.changeDetectorRef.detectChanges();
        this.cancelButtonRef.nativeElement.focus();
      } else if (validUntil.isBefore(now)) {
        this.customerState.set(CustomerState.INVALID);
        this.changeDetectorRef.detectChanges();
        this.cancelButtonRef.nativeElement.focus();
      } else {
        const warnLimit = now.add(this.VALID_UNTIL_WARNLIMIT_WEEKS, 'weeks');
        if (!validUntil.isAfter(warnLimit)) {
          this.customerState.set(CustomerState.VALID_WARN);
        } else {
          this.customerState.set(CustomerState.VALID);
        }

        this.changeDetectorRef.detectChanges();
        this.ticketNumberInputRef.nativeElement.focus();
      }
    } else {
      this.customerState.set(undefined);
    }
  }

  cancel() {
    this.processCustomer(undefined);
    this.customerNotes = [];
    this.customerId = undefined;
    this.ticketNumber = undefined;
    this.ticketNumberEdit = undefined;
    this.costContributionPaid = true;
    this.customerIdInputRef.nativeElement.focus();
  }

  assignCustomer() {
    if (this.ticketNumber > 0) {
      /* eslint-disable @typescript-eslint/no-unused-vars */
      const observer = {
        next: (response) => this.cancel()
      };
      this.distributionApiService.assignCustomer(this.customer().id, this.ticketNumber, this.costContributionPaid).subscribe(observer);
      this.customerIdInputRef.nativeElement.focus();
    }
  }

  deleteTicket() {
    const observer = {
      next: () => {
        this.ticketNumber = undefined;
        this.ticketNumberEdit = undefined;
        this.costContributionPaid = true;
        this.toastService.showToast({type: ToastType.SUCCESS, title: 'Ticket-Nummer gelöscht!'});
        this.ticketNumberInputRef.nativeElement.focus();
      }
    };
    this.distributionTicketApiService.deleteCurrentTicketOfCustomer(this.customer().id).subscribe(observer);
  }
}

export enum CustomerState {
  LOCKED, INVALID, VALID_WARN, VALID
}

export interface ScanResult {
  value: number;
}
