import {Injectable} from '@angular/core';
import {CompatClient, Stomp, StompHeaders} from '@stomp/stompjs';
import {PlatformLocation} from "@angular/common";
import {frameCallbackType} from "@stomp/stompjs/src/types";

@Injectable()
export class ScannerApiService {

  private client: CompatClient;

  constructor(
    private location: PlatformLocation
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

  getBaseUrl() {
    return 'ws://' + this.location.hostname + ':' + this.location.port + '/ws-api';
  }

}

export interface ScanResult {
  content: string
}
