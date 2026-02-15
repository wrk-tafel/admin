import {Directive, effect, inject, TemplateRef, ViewContainerRef} from '@angular/core';
import {GlobalStateService} from '../state/global-state.service';

@Directive({
  standalone: true,
  selector: '[tafelIfDistributionActive]'
})
export class TafelIfDistributionActiveDirective {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  private readonly templateRef = inject(TemplateRef<any>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly globalStateService = inject(GlobalStateService);

  initialEffect = effect(() => {
    const distributionItem = this.globalStateService.getCurrentDistribution()();
    if (distributionItem) {
      this.viewContainer.clear();
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      this.viewContainer.clear();
    }
  });

}
