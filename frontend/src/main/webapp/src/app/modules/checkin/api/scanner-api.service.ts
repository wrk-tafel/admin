import {Injectable} from '@angular/core';
import {CompatClient, Stomp, StompHeaders} from '@stomp/stompjs';
import {PlatformLocation} from '@angular/common';
import {frameCallbackType} from '@stomp/stompjs/src/types';

@Injectable()
export class ScannerApiService {
  private client: CompatClient;

  constructor(
    private platformLocation: PlatformLocation
  ) {
  }

  connect(connectCallback: frameCallbackType,
          errorCallback: frameCallbackType,
          closeCallback: frameCallbackType) {
    const headers: StompHeaders = {};

    this.client = Stomp.client(this.getBaseUrl());
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
