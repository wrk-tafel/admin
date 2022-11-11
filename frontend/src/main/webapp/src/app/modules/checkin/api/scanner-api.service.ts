import {Injectable} from '@angular/core';
import {CompatClient, Stomp, StompHeaders} from '@stomp/stompjs';
import {PlatformLocation} from '@angular/common';
import {frameCallbackType} from '@stomp/stompjs/src/types';
import {CookieService} from "ngx-cookie-service";
import {AuthenticationService} from "../../../common/security/authentication.service";

@Injectable()
export class ScannerApiService {
  private client: CompatClient;

  constructor(
    private platformLocation: PlatformLocation,
    private cookieService: CookieService,
    private authenticationService: AuthenticationService
  ) {
  }

  connect(connectCallback: frameCallbackType,
          errorCallback: frameCallbackType,
          closeCallback: frameCallbackType) {

    const headers: StompHeaders = {
      'X-XSRF-TOKEN': this.cookieService.get('XSRF-TOKEN'),
      'Authorization': 'Bearer ' + this.authenticationService.getTokenString()
    };

    this.client = Stomp.client(this.getBaseUrl());
    // TODO this.client.reconnect_delay = 2000;

    // TODO this.client.reconnect_delay = 2000; ENABLED RECONNECT

    this.client.configure({
      connectHeaders: {}
    });

    this.client.connect(headers, connectCallback, errorCallback, closeCallback);
  }

  sendScanResult(result: ScanResult) {
    this.client.send('/app/scanners/result', {}, JSON.stringify(result));
  }

  close() {
    this.client.forceDisconnect();
  }

  private getBaseUrl() {
    const protocol = this.platformLocation.protocol.replace('http', 'ws');

    let pathname = this.platformLocation.pathname;
    if (pathname === '/') {
      pathname = '';
    }

    return protocol + '//' + this.platformLocation.hostname + ':' + this.platformLocation.port + pathname + '/ws-api';
  }

}

export interface ScanResult {
  value: string;
}
