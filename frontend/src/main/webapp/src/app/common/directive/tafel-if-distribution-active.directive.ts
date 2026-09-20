import {computed, Directive, effect, inject, TemplateRef, ViewContainerRef} from '@angular/core';
import {GlobalStateService} from '../state/global-state.service';

@Directive({
  standalone: true,
  selector: '[tafelIfDistributionActive]'
})
export class TafelIfDistributionActiveDirective {

  private readonly templateRef = inject(TemplateRef<any>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly globalStateService = inject(GlobalStateService);

  // A boolean, so the view is only rebuilt when a distribution opens or closes - not for every new
  // object the stream delivers for the same distribution (e.g. a changed registered-customer count).
  private readonly active = computed(() => !!this.globalStateService.getCurrentDistribution()());

  initialEffect = effect(() => {
    if (this.active()) {
      this.viewContainer.clear();
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      this.viewContainer.clear();
    }
  });

}
