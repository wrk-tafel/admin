import {ChangeDetectorRef, Component, ElementRef, inject, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {CustomerApiService, CustomerData, Gender, GenderLabel} from '../../../../api/customer-api.service';
import {Subscription} from 'rxjs';
import * as moment from 'moment';
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
    TabsListComponent
  ],
  standalone: true
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
  customer: CustomerData;
  customerState: CustomerState;
  customerStateText: string;
  customerNotes: CustomerNoteItem[];
  ticketNumber: number;
  ticketNumberEdit = false;
  costContributionPaid: boolean = true;

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
    this.customerApiService.getCustomer(this.customerId).subscribe(observer);
  }

  processCustomer(customer: CustomerData) {
    this.ticketNumber = undefined;
    this.costContributionPaid = true;
    this.customer = customer;

    if (customer) {
      const validUntil = moment(customer.validUntil).startOf('day');
      const now = moment().startOf('day');

      if (customer.locked) {
        this.customerState = CustomerState.RED;
        this.customerStateText = 'GESPERRT';

        this.changeDetectorRef.detectChanges();
        this.cancelButtonRef.nativeElement.focus();
      } else if (validUntil.isBefore(now)) {
        this.customerState = CustomerState.RED;
        this.customerStateText = 'UNGÜLTIG';

        this.changeDetectorRef.detectChanges();
        this.cancelButtonRef.nativeElement.focus();
      } else {
        const warnLimit = now.add(this.VALID_UNTIL_WARNLIMIT_WEEKS, 'weeks');
        if (!validUntil.isAfter(warnLimit)) {
          this.customerState = CustomerState.YELLOW;
          this.customerStateText = 'GÜLTIG - läuft bald ab';
        } else {
          this.customerState = CustomerState.GREEN;
          this.customerStateText = 'GÜLTIG';
        }

        this.changeDetectorRef.detectChanges();
        this.ticketNumberInputRef.nativeElement.focus();
      }
    } else {
      this.customerState = undefined;
      this.customerStateText = undefined;
    }
  }

  getInfantCount(): number {
    const length = this.customer.additionalPersons.filter((person) => {
      return moment().diff(person.birthDate, 'years') < 3;
    }).length;
    return length;
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

  formatAddress(): string {
    if (this.customer) {
      const formatted = [
        [this.customer.address.street, this.customer.address.houseNumber].join(' '),
        this.customer.address.stairway ? 'Stiege ' + this.customer.address.stairway : undefined,
        this.customer.address.door ? 'Top ' + this.customer.address.door : undefined,
        [this.customer.address.postalCode, this.customer.address.city].join(' ')
      ]
        .filter(value => value?.trim().length > 0)
        .join(', ');
      return formatted?.trim().length > 0 ? formatted : '-';
    }
  }

  formatName(): string {
    if (this.customer) {
      const formatted = [this.customer.lastname, this.customer.firstname].join(' ');
      return formatted?.trim().length > 0 ? formatted : undefined;
    }
    return undefined;
  }

  assignCustomer() {
    if (this.ticketNumber > 0) {
      /* eslint-disable @typescript-eslint/no-unused-vars */
      const observer = {
        next: (response) => this.cancel()
      };
      this.distributionApiService.assignCustomer(this.customer.id, this.ticketNumber, this.costContributionPaid).subscribe(observer);
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
    this.distributionTicketApiService.deleteCurrentTicketOfCustomer(this.customer.id).subscribe(observer);
  }

  getBirthDateAndAge(birthDate?: Date): string {
    if (birthDate) {
      const age = moment().diff(birthDate, 'years');
      return moment(birthDate).format('DD.MM.YYYY') + ' (' + age + ')';
    }
    return '-';
  }

  getGenderLabel(gender?: Gender): string {
    if (gender) {
      return GenderLabel[gender];
    }
    return '-';
  }

  protected getCustomerStateColor(): Colors {
    switch (this.customerState) {
      case CustomerState.RED:
        return 'danger';
      case CustomerState.YELLOW:
        return 'warning';
      case CustomerState.GREEN:
        return 'success';
      default:
        return null;
    }
  }
}

export enum CustomerState {
  RED, YELLOW, GREEN
}

export interface ScanResult {
  value: number;
}
