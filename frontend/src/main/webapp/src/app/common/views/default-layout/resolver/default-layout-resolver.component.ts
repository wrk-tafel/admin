import {inject, Injectable} from '@angular/core';
import {WebsocketService} from '../../../websocket/websocket.service';
import {GlobalStateService} from '../../../state/global-state.service';

@Injectable({
  providedIn: 'root'
})
export class DefaultLayoutResolver {
  private readonly websocketService = inject(WebsocketService);
  private readonly globalStateService = inject(GlobalStateService);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  public resolve(): Promise<any[]> {
    return Promise.all([this.websocketService.connect(), this.globalStateService.init()]);
  }

}
