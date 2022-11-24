import {Injectable} from '@angular/core';
import {PlatformLocation} from '@angular/common';
import {CookieService} from 'ngx-cookie-service';
import {AuthenticationService} from '../../../common/security/authentication.service';
import {RxStomp} from '@stomp/rx-stomp';
import {RxStompConfig} from '@stomp/rx-stomp/esm6/rx-stomp-config';
import {BehaviorSubject} from 'rxjs';
import {RxStompState} from '@stomp/rx-stomp/esm6/rx-stomp-state';

@Injectable()
export class ScannerApiService {
  private client: RxStomp;

  constructor(
    private platformLocation: PlatformLocation,
    private cookieService: CookieService,
    private authenticationService: AuthenticationService
  ) {
  }

  connect(): BehaviorSubject<RxStompState> {
    const stompConfig: RxStompConfig = {
      brokerURL: this.getBaseUrl(),
      // brokerURL: 'wss://socketsbay.com/wss/v2/2/demo/',
      /*
      connectHeaders: {
        'X-XSRF-TOKEN': this.cookieService.get('XSRF-TOKEN'),
        'Authorization': 'Bearer ' + this.authenticationService.getTokenString()
      },
       */
      debug: function (str) {
        console.log('RX-STOMP: ' + str);
      },
      logRawCommunication: true,
      reconnectDelay: 2000
    };

    this.client = new RxStomp();
    this.client.configure(stompConfig);
    this.client.activate();

    return this.client.connectionState$;
  }

  sendScanResult(result: ScanResult) {
    this.client.publish({destination: '/app/scanners/result', body: JSON.stringify(result)});
  }

  close() {
    this.client.deactivate();
  }

  private getBaseUrl() {
    let pathname = this.platformLocation.pathname;
    if (pathname === '/') {
      pathname = '';
    }

    const baseUrl = this.platformLocation.protocol + '//' + this.platformLocation.hostname + ':' + this.platformLocation.port + pathname + '/api/websockets';
    return baseUrl.replace('http', 'ws');
  }

}

export interface ScanResult {
  value: string;
}
