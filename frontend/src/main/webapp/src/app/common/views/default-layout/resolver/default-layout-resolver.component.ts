import {Injectable} from '@angular/core';
import {WebsocketService} from '../../../websocket/websocket.service';
import {GlobalStateService} from '../../../state/global-state.service';

@Injectable({
  providedIn: 'root'
})
export class DefaultLayoutResolver {

  constructor(
    private websocketService: WebsocketService,
    private globalStateService: GlobalStateService
  ) {
  }

  public resolve(): Promise<any[]> {
    return Promise.all([this.websocketService.connect(), this.globalStateService.init()]);
  }

}
