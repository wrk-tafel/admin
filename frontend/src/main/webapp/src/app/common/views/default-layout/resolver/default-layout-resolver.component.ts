import {inject, Injectable} from '@angular/core';
import {GlobalStateService} from '../../../state/global-state.service';

@Injectable({
  providedIn: 'root'
})
export class DefaultLayoutResolver {
  private readonly globalStateService = inject(GlobalStateService);


  public resolve(): void {
    this.globalStateService.init();
  }

}
