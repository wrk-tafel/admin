import {ChangeDetectorRef, Component, ElementRef, inject, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {CustomerApiService, CustomerData} from '../../../../api/customer-api.service';
import {Subscription} from 'rxjs';
import {IMessage} from '@stomp/stompjs';
import * as moment from 'moment';
import {ScannerList} from '../scanner/scanner.component';
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
  FormSelectDirective,
  RowComponent
} from '@coreui/angular';
import {DistributionTicketApiService} from '../../../../api/distribution-ticket-api.service';
import {ToastService, ToastType} from '../../../../common/components/toasts/toast.service';
import {WebsocketService} from '../../../../common/websocket/websocket.service';
import {FormsModule} from '@angular/forms';
import {CommonModule, DatePipe, NgClass} from '@angular/common';
import {TafelAutofocusDirective} from '../../../../common/directive/tafel-autofocus.directive';

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
    TafelAutofocusDirective
  ],
  standalone: true
})
export class CheckinComponent implements OnInit, OnDestroy {
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
  @ViewChild('customerIdInput') customerIdInputRef: ElementRef;
  @ViewChild('ticketNumberInput') ticketNumberInputRef: ElementRef;
  @ViewChild('cancelButton') cancelButtonRef: ElementRef;
  private readonly customerApiService = inject(CustomerApiService);
  private readonly customerNoteApiService = inject(CustomerNoteApiService);
  private readonly websocketService = inject(WebsocketService);
  private readonly globalStateService = inject(GlobalStateService);
  private readonly distributionApiService = inject(DistributionApiService);
  private readonly distributionTicketApiService = inject(DistributionTicketApiService);
  private readonly router = inject(Router);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly toastService = inject(ToastService);
  private readonly VALID_UNTIL_WARNLIMIT_WEEKS = 8;

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
      this.scannerSubscription = this.websocketService.watch(`/topic/scanners/${this.currentScannerId}/results`)
        .subscribe((message: IMessage) => {
          const result: ScanResult = JSON.parse(message.body);
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

    this.websocketService.watch('/topic/scanners').subscribe((message: IMessage) => {
      const scanners: ScannerList = JSON.parse(message.body);
      this.scannerIds = scanners.scannerIds;
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

        this.distributionTicketApiService.getCurrentTicketForCustomer(customerData.id).subscribe((ticketNumberResponse) => {
          if (ticketNumberResponse.ticketNumber) {
            this.ticketNumber = ticketNumberResponse.ticketNumber;
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
      this.distributionApiService.assignCustomer(this.customer.id, this.ticketNumber).subscribe(observer);
      this.customerIdInputRef.nativeElement.focus();
    }
  }

  deleteTicket() {
    const observer = {
      next: () => {
        this.ticketNumber = undefined;
        this.ticketNumberEdit = undefined;
        this.toastService.showToast({type: ToastType.SUCCESS, title: 'Ticket-Nummer gelöscht!'});
        this.ticketNumberInputRef.nativeElement.focus();
      }
    };
    this.distributionTicketApiService.deleteCurrentTicketOfCustomer(this.customer.id).subscribe(observer);
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
