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
  client: RxStomp = new RxStomp();

  constructor(private platformLocation: PlatformLocation) {
    // private cookieService: CookieService,
    // private authenticationService: AuthenticationService
  }

  init(): void {
    const stompConfig: RxStompConfig = {
      brokerURL: this.getBaseUrl(),
      /*
      connectHeaders: {
        'X-XSRF-TOKEN': this.cookieService.get('XSRF-TOKEN'),
        'Authorization': 'Bearer ' + this.authenticationService.getTokenString()
      },
       */
      debug: function (str) {
        // tslint:disable-next-line:no-console
        console.debug('RX-STOMP: ' + str);
      },
      heartbeatIncoming: 0, // Typical value 0 - disabled
      heartbeatOutgoing: 20000, // Typical value 20000 - every 20 seconds
      logRawCommunication: true
    };

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

  getBaseUrl() {
    let pathname = this.platformLocation.pathname;
    if (pathname === '/') {
      pathname = '';
    }

    const baseUrl = this.platformLocation.protocol + '//' + this.platformLocation.hostname + ':' + this.platformLocation.port + pathname + '/api/websockets';
    return baseUrl.replace('http', 'ws');
  }

}
