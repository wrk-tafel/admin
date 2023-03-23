import {Component, OnDestroy, OnInit} from '@angular/core';
import {CustomerApiService, CustomerData} from '../../../api/customer-api.service';
import {WebsocketService} from '../../../common/websocket/websocket.service';
import {Subscription} from 'rxjs';
import {IMessage} from '@stomp/stompjs';
import * as moment from 'moment';
import {ScannerList} from '../scanner/scanner.component';
import {CustomerNoteApiService, CustomerNoteItem, CustomerNotesResponse} from '../../../api/customer-note-api.service';

@Component({
  selector: 'tafel-checkin',
  templateUrl: 'checkin.component.html'
})
export class CheckinComponent implements OnInit, OnDestroy {

  constructor(
    private customerApiService: CustomerApiService,
    private customerNoteApiService: CustomerNoteApiService,
    private websocketService: WebsocketService
  ) {
  }

  private VALID_UNTIL_WARNLIMIT_WEEKS = 6;

  errorMessage: string;

  scannerIds: number[];
  currentScannerId: number;
  scannerReadyState: boolean;
  scannerSubscription: Subscription;

  customerId: number;
  customer: CustomerData;
  customerState: CustomerState;
  customerStateText: string;

  customerNotes: CustomerNoteItem[];

  ngOnInit(): void {
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
    const promises: Promise<any[]> = Promise.all(
      [
        this.customerApiService.getCustomer(this.customerId).toPromise(),
        this.customerNoteApiService.getNotesForCustomer(this.customerId).toPromise()
      ]
    );

    promises.then((result: any[]) => {
      const customerData: CustomerData = result[0];
      const customerNotes: CustomerNotesResponse = result[1];

      this.processCustomer(customerData);
      this.errorMessage = undefined;

      this.customerNotes = customerNotes.notes;
    }, (error) => {
      if (error.status === 404) {
        this.processCustomer(undefined);
        this.errorMessage = 'Kundennummer ' + this.customerId + ' nicht gefunden!';
      }
    });
  }

  processCustomer(customer: CustomerData) {
    this.customer = customer;

    if (customer) {
      const validUntil = moment(customer.validUntil).startOf('day');
      const now = moment().startOf('day');

      if (validUntil.isBefore(now)) {
        this.customerState = CustomerState.RED;
        this.customerStateText = 'UNGÜLTIG';
      } else {
        const warnLimit = now.add(this.VALID_UNTIL_WARNLIMIT_WEEKS, 'weeks');
        if (!validUntil.isAfter(warnLimit)) {
          this.customerState = CustomerState.YELLOW;
          this.customerStateText = 'GÜLTIG - läuft bald ab';
        } else {
          this.customerState = CustomerState.GREEN;
          this.customerStateText = 'GÜLTIG';
        }
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
    this.customerId = undefined;
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

}

export enum CustomerState {
  RED, YELLOW, GREEN
}

export interface ScanResult {
  value: number;
}
