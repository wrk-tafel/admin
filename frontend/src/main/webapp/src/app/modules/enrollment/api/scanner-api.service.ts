import {Injectable} from '@angular/core';
import {CompatClient, Stomp, StompHeaders} from '@stomp/stompjs';
import {Router} from '@angular/router';
import {IFrame} from "@stomp/stompjs/src/i-frame";

@Injectable()
export class ScannerApiService {

  constructor(
    private window: Window,
    private router: Router
  ) {
  }

  private client: CompatClient;

  test() {
    const headers: StompHeaders = {};

    this.client = Stomp.client('ws://localhost:4200/ws-api');
    this.client.connect(headers, this.connected, this.error, this.close);
  }

  private connected = (receipt: IFrame) => {
    console.log("CONNECTED TO WS", receipt);
    setInterval(() => {
      this.client.send('/app/scanners', {}, 'Hello World from Angular!');
      console.log("SENT MESSAGE");
    }, 1000);
  };

  private error = (receipt: IFrame) => {
    console.log("ERROR FROM WS", receipt);
  };

  private close = (receipt: IFrame) => {
    console.log("CLOSED WS", receipt);
  };

}
