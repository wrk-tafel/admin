import {inject, Service} from '@angular/core';
import {GlobalStateService} from '../../../state/global-state.service';

@Service()
export class DefaultLayoutResolver {
  private readonly globalStateService = inject(GlobalStateService);


  public resolve(): void {
    this.globalStateService.init();
  }

}
