import {inject, Injectable} from '@angular/core';
import {GlobalStateService} from '../../../state/global-state.service';

@Injectable({
  providedIn: 'root'
})
export class DefaultLayoutResolver {
  private readonly globalStateService = inject(GlobalStateService);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  public resolve(): Promise<any[]> {
    return Promise.all([this.globalStateService.init()]);
  }

}
