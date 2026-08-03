import {Component, computed, inject, input, Signal} from '@angular/core';
import {MatCard, MatCardHeader, MatCardTitle, MatCardContent} from '@angular/material/card';
import {DistributionItem} from '../../../../api/distribution-api.service';
import {GlobalStateService} from '../../../../common/state/global-state.service';

@Component({
  selector: 'tafel-recorded-food-collections',
  templateUrl: 'recorded-food-collections.component.html',
  imports: [
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent
  ]
})
export class RecordedFoodCollectionsComponent {
  countRecorded = input<number | null>(null);
  countTotal = input<number | null>(null);
  recordedRouteNames = input<string[] | null>(null);

  private readonly globalStateService = inject(GlobalStateService);

  readonly distribution: Signal<DistributionItem | null> = this.globalStateService.getCurrentDistribution();

  panelColor = computed<string>(() => {
    if (!this.distribution()) {
      return 'primary';
    } else if ((this.countRecorded() ?? 0) < (this.countTotal() ?? 0)) {
      return 'warning';
    } else {
      return 'success';
    }
  });

}
