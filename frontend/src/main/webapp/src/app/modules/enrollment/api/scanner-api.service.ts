import {Injectable} from '@angular/core';
import {Stomp, StompHeaders} from '@stomp/stompjs';

@Injectable()
export class ScannerApiService {

  test() {
    const headers: StompHeaders = {
      login: 'mylogin',
      passcode: 'mypasscode',
      // additional header
      'client-id': 'my-client-id'
    };

    const client = Stomp.client('/ws-api/scanners');
    client.connect();
  }

}
