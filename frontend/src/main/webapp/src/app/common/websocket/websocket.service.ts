import {Injectable, OnDestroy} from '@angular/core';
import {IRxStompPublishParams, RxStomp} from '@stomp/rx-stomp';
import {RxStompConfig} from '@stomp/rx-stomp/esm6/rx-stomp-config';
import {BehaviorSubject, Observable} from 'rxjs';
import {RxStompState} from '@stomp/rx-stomp/esm6/rx-stomp-state';
import {IMessage} from '@stomp/stompjs';
import {UrlHelperService} from '../util/url-helper.service';

@Injectable({
  providedIn: 'root',
})
export class WebsocketService implements OnDestroy {
  client: RxStomp = new RxStomp();

  constructor(private urlHelper: UrlHelperService) {
  }

  connect() {
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
    this.client.activate();
  }

  ngOnDestroy(): void {
    this.client.deactivate();
  }

  getConnectionState(): BehaviorSubject<RxStompState> {
    return this.client.connectionState$;
  }

  publish(parameters: IRxStompPublishParams) {
    this.client.publish(parameters);
  }

  watch(destination: string): Observable<IMessage> {
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
