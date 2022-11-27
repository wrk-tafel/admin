import {Injectable, OnInit} from '@angular/core';
import {IRxStompPublishParams, RxStomp} from '@stomp/rx-stomp';
import {PlatformLocation} from '@angular/common';
import {RxStompConfig} from '@stomp/rx-stomp/esm6/rx-stomp-config';
import {BehaviorSubject} from 'rxjs';
import {RxStompState} from '@stomp/rx-stomp/esm6/rx-stomp-state';

@Injectable({
  providedIn: 'root',
})
export class WebsocketService {
  private client: RxStomp;

  constructor(private platformLocation: PlatformLocation) {
    // private cookieService: CookieService,
    //               private authenticationService: AuthenticationService
    this.init();
  }

  init(): void {
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
  }

  getConnectionState(): BehaviorSubject<RxStompState> {
    return this.client.connectionState$;
  }

  connect() {
    this.client.activate();
  }

  publish(parameters: IRxStompPublishParams) {
    this.client.publish(parameters);
  }

  close(): Promise<void> {
    return this.client.deactivate();
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
