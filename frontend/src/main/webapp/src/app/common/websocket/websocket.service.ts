import {Injectable} from '@angular/core';
import {IRxStompPublishParams, IWatchParams, RxStomp} from '@stomp/rx-stomp';
import {PlatformLocation} from '@angular/common';
import {RxStompConfig} from '@stomp/rx-stomp/esm6/rx-stomp-config';
import {BehaviorSubject, Observable} from 'rxjs';
import {RxStompState} from '@stomp/rx-stomp/esm6/rx-stomp-state';
import {IMessage} from '@stomp/stompjs';

@Injectable({
  providedIn: 'root',
})
export class WebsocketService {
  client: RxStomp = new RxStomp();

  constructor(private platformLocation: PlatformLocation) {
  }

  init(): void {
    const stompConfig: RxStompConfig = {
      brokerURL: this.getBaseUrl(),
      /*
      // TODO keep it for development purposes
      debug: function (str) {
        // tslint:disable-next-line:no-console
        console.debug('RX-STOMP: ' + str);
      },
      logRawCommunication: true
       */
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

  subscribe(opts: IWatchParams): Observable<IMessage> {
    return this.client.watch(opts);
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
