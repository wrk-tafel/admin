import {Component, OnInit} from '@angular/core';
import {CustomerApiService, CustomerData} from '../../../api/customer-api.service';
import {ScannerApiService, ScanResult} from '../../../api/scanner-api.service';
import {WebsocketService} from '../../../common/websocket/websocket.service';
import {Subscription} from 'rxjs';
import {IMessage} from '@stomp/stompjs';
import {RxStompState} from '@stomp/rx-stomp';

@Component({
  selector: 'tafel-checkin',
  templateUrl: 'checkin.component.html'
})
export class CheckinComponent implements OnInit {

  constructor(
    private customerApiService: CustomerApiService,
    private scannerApiService: ScannerApiService,
    private websocketService: WebsocketService
  ) {
  }

  errorMessage: string;

  scannerIds: number[];
  currentScannerId: number;
  wsApiClientReady: boolean = false;
  scannerReadyState: boolean;
  scannerSubscription: Subscription;

  customerId: number;
  customer: CustomerData;

  ngOnInit(): void {
    this.websocketService.init();
    this.websocketService.connect();

    this.websocketService.getConnectionState().subscribe((state: RxStompState) => {
      this.processWsConnectionState(state);
    });

    this.scannerApiService.getScannerIds().subscribe(response => {
      this.scannerIds = response.scannerIds;
    });
  }

  searchForCustomerId() {
    this.customerApiService.getCustomer(this.customerId)
      .subscribe((customer: CustomerData) => {
        this.customer = customer;
        this.errorMessage = undefined;
      }, error => {
        if (error.status === 404) {
          this.customer = undefined;
          this.errorMessage = 'Kundennummer ' + this.customerId + ' nicht gefunden!';
        }
      });
  }

  processWsConnectionState(state: RxStompState) {
    if (state === RxStompState.OPEN) {
      this.wsApiClientReady = true;
    } else {
      this.wsApiClientReady = false;
    }
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
