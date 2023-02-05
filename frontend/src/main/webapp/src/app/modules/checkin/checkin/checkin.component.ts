import {Component, OnInit} from '@angular/core';
import {CustomerApiService} from '../../../api/customer-api.service';
import {ScannerApiService} from '../../../api/scanner-api.service';
import {WebsocketService} from '../../../common/websocket/websocket.service';

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

  scannerIds: number[];
  currentScannerId: number;
  scannerReadyState: boolean;
  customerId: number;

  ngOnInit(): void {
    this.scannerApiService.getScannerIds().subscribe(response => {
      this.scannerIds = response.scannerIds;
    });
  }

  searchForCustomerId() {
    this.customerApiService.getCustomer(this.customerId)
      .subscribe(() => {
        // TODO impl - show details panel
      }, error => {
        if (error.status === 404) {
          // TODO impl
          // this.errorMessage = 'Kundennummer ' + customerId + ' nicht gefunden!';
        }
      });
  }

  get selectedScannerId(): number {
    return this.currentScannerId;
  }

  set selectedScannerId(scannerId: number) {
    this.currentScannerId = scannerId;
    /*
    this.websocketService.subscribe('').subscribe(response => {

    });
     */
    // TODO in case of change quit subscribe
    // TODO subscribe ws topic
  }

}
