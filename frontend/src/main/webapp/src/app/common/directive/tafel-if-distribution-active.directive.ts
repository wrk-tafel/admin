import {AfterViewInit, Directive, TemplateRef, ViewContainerRef} from '@angular/core';
import {GlobalStateService} from '../state/global-state.service';
import {DistributionItem} from '../../api/distribution-api.service';

@Directive({
  selector: '[tafelIfDistributionActive]'
})
export class TafelIfDistributionActiveDirective implements AfterViewInit {

  constructor(
    /* eslint-disable @typescript-eslint/no-explicit-any */
    private readonly templateRef: TemplateRef<any>,
    private readonly viewContainer: ViewContainerRef,
    private readonly globalStateService: GlobalStateService) {
  }

  ngAfterViewInit(): void {
    this.globalStateService.getCurrentDistribution().subscribe((distributionItem: DistributionItem) => {
      if (distributionItem) {
        this.viewContainer.clear();
        this.viewContainer.createEmbeddedView(this.templateRef);
      } else {
        this.viewContainer.clear();
      }
    });
  }

}
