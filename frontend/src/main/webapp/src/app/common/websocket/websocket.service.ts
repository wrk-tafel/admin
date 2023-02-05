import {Injectable} from '@angular/core';
import {IRxStompPublishParams, RxStomp} from '@stomp/rx-stomp';
import {RxStompConfig} from '@stomp/rx-stomp/esm6/rx-stomp-config';
import {BehaviorSubject, Observable} from 'rxjs';
import {RxStompState} from '@stomp/rx-stomp/esm6/rx-stomp-state';
import {IMessage} from '@stomp/stompjs';
import {UrlHelperService} from '../util/url-helper.service';

@Injectable({
  providedIn: 'root',
})
export class WebsocketService {
  client: RxStomp = new RxStomp();

  constructor(private urlHelper: UrlHelperService) {
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

  subscribe(destination: string): Observable<IMessage> {
    return this.client.watch(destination);
  }

  close(): Promise<void> {
    return this.client.deactivate();
  }

  getBaseUrl() {
    const baseUrl = this.urlHelper.getBaseUrl() + '/api/websockets';
    return baseUrl.replace('http', 'ws');
  }

}
