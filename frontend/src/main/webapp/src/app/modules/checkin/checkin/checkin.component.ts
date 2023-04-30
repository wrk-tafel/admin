import {Component, OnDestroy, OnInit} from '@angular/core';
import {CustomerApiService, CustomerData} from '../../../api/customer-api.service';
import {WebsocketService} from '../../../common/websocket/websocket.service';
import {Subscription} from 'rxjs';
import {IMessage} from '@stomp/stompjs';
import * as moment from 'moment';
import {ScannerList} from '../scanner/scanner.component';
import {CustomerNoteApiService, CustomerNoteItem} from '../../../api/customer-note-api.service';
import {GlobalStateService} from '../../../common/state/global-state.service';
import {Router} from '@angular/router';
import {DistributionApiService} from '../../../api/distribution-api.service';
import {Colors} from '@coreui/angular';

@Component({
  selector: 'tafel-checkin',
  templateUrl: 'checkin.component.html'
})
export class CheckinComponent implements OnInit, OnDestroy {

  constructor(
    private customerApiService: CustomerApiService,
    private customerNoteApiService: CustomerNoteApiService,
    private websocketService: WebsocketService,
    private globalStateService: GlobalStateService,
    private distributionApiService: DistributionApiService,
    private router: Router,
  ) {
  }

  private VALID_UNTIL_WARNLIMIT_WEEKS = 8;

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
  focusTicketNumberInput: boolean;
  focusResetButton = false;

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
          this.customerNotes = notesResponse.notes;
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

      if (validUntil.isBefore(now)) {
        this.customerState = CustomerState.RED;
        this.customerStateText = 'UNGÜLTIG';
        this.focusResetButton = true;
      } else {
        const warnLimit = now.add(this.VALID_UNTIL_WARNLIMIT_WEEKS, 'weeks');
        if (!validUntil.isAfter(warnLimit)) {
          this.customerState = CustomerState.YELLOW;
          this.customerStateText = 'GÜLTIG - läuft bald ab';
        } else {
          this.customerState = CustomerState.GREEN;
          this.customerStateText = 'GÜLTIG';
        }

        this.focusTicketNumberInput = true;
      }
    } else {
      this.customerState = undefined;
      this.customerStateText = undefined;
    }
  }

  getInfantCount(): number {
    return this.customer.additionalPersons.filter((person) => {
      return moment().diff(person.birthDate, 'years') < 3;
    }).length;
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
      this.scannerSubscription = this.websocketService.watch(`/topic/scanners/${this.currentScannerId}/results`)
        .subscribe((message: IMessage) => {
          const result: ScanResult = JSON.parse(message.body);
          this.customerId = result.value;
          this.searchForCustomerId();
        });

      this.scannerReadyState = true;
    }
  }

  reset() {
    this.processCustomer(undefined);
    this.customerNotes = [];
    this.customerId = undefined;
    this.ticketNumber = undefined;
    this.focusResetButton = false;
  }

  formatAddress(): string {
    if (this.customer) {
      const address = this.customer.address;
      let result = '';
      result += address.street + ' ' + address.houseNumber;
      if (address.stairway) {
        result += ', Stiege ' + address.stairway;
      }
      if (address.stairway) {
        result += ', Top ' + address.door;
      }
      result += ' / ' + address.postalCode + ' ' + address.city;
      return result;
    }
  }

  assignCustomer() {
    if (this.ticketNumber > 0) {
      /* eslint-disable @typescript-eslint/no-unused-vars */
      const observer = {
        next: (response) => this.reset(),
        error: error => {
        },
      };
      this.distributionApiService.assignCustomer(this.customer.id, this.ticketNumber).subscribe(observer);
    }
  }

  get scannerReadyStateColor(): Colors {
    return this.scannerReadyState ? 'success' : 'danger';
  }

  get customerStateColor(): Colors {
    switch (this.customerState) {
      case CustomerState.RED:
        return 'danger';
      case CustomerState.YELLOW:
        return 'warning';
      case CustomerState.GREEN:
        return 'success';
    }
  }
}

export enum CustomerState {
  RED, YELLOW, GREEN
}

export interface ScanResult {
  value: number;
}
