import {Injectable} from '@angular/core';
import {CompatClient, Stomp, StompHeaders} from '@stomp/stompjs';
import {IFrame} from "@stomp/stompjs/src/i-frame";
import {PlatformLocation} from "@angular/common";

@Injectable()
export class ScannerApiService {

  private client: CompatClient;

  constructor(
    private location: PlatformLocation
  ) {
  }

  connect() {
    const headers: StompHeaders = {};

    this.client = Stomp.client(this.getBaseUrl());
    // TODO Promise.any<IFrame>([this.connect, this.error]);
    this.client.connect(headers, this.connected, this.error, this.close);
  }

  sendScanResult(result: ScanResult) {
    this.client.send('/app/scanners', {}, JSON.stringify(result));
  }

  private connected = (receipt: IFrame) => {
    console.log("CONNECTED TO WS", receipt);
  };

  private error = (receipt: IFrame) => {
    console.log("ERROR FROM WS", receipt);
  };

  private close = (receipt: IFrame) => {
    console.log("CLOSED WS", receipt);
  };

  private getBaseUrl() {
    return 'ws://' + this.location.hostname + ':' + this.location.port + '/ws-api';
  }

}

export interface ScanResult {
  content: string
}
