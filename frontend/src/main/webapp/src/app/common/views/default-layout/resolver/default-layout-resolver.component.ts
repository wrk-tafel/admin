import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, Resolve, RouterStateSnapshot} from '@angular/router';
import {WebsocketService} from '../../../websocket/websocket.service';
import {GlobalStateService} from '../../../state/global-state.service';

@Injectable({
  providedIn: 'root'
})
/* eslint-disable @typescript-eslint/no-explicit-any */
export class DefaultLayoutResolver implements Resolve<any[]> {

  constructor(
    private websocketService: WebsocketService,
    private globalStateService: GlobalStateService
  ) {
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  /* eslint-disable @typescript-eslint/no-unused-vars */
  public resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<any[]> {
    return Promise.all([this.websocketService.connect(), this.globalStateService.init()]);
  }

}
