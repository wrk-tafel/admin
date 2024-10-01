import {AfterViewInit, Directive, TemplateRef, ViewContainerRef} from '@angular/core';
import {GlobalStateService} from '../state/global-state.service';
import {DistributionItem} from '../../api/distribution-api.service';

@Directive({
  standalone: true,
  selector: '[tafelIfDistributionActive]'
})
export class TafelIfDistributionActiveDirective implements AfterViewInit {

  constructor(
    /* eslint-disable @typescript-eslint/no-explicit-any */
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private globalStateService: GlobalStateService) {
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
