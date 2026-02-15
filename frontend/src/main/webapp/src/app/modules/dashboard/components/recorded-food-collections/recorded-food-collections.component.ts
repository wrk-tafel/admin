import {Component, computed, inject, input, Signal} from '@angular/core';
import {CardBodyComponent, CardComponent, ColComponent, Colors, RowComponent} from '@coreui/angular';
import {DistributionItem} from '../../../../api/distribution-api.service';
import {GlobalStateService} from '../../../../common/state/global-state.service';

@Component({
    selector: 'tafel-recorded-food-collections',
    templateUrl: 'recorded-food-collections.component.html',
    imports: [
        CardComponent,
        CardBodyComponent,
        RowComponent,
        ColComponent
    ]
})
export class RecordedFoodCollectionsComponent {
  countRecorded = input<number | null>(null);
  countTotal = input<number | null>(null);

  private readonly globalStateService = inject(GlobalStateService);

  readonly distribution: Signal<DistributionItem> = this.globalStateService.getCurrentDistribution();

  panelColor = computed<Colors>(() => {
    if (!this.distribution()) {
      return 'primary';
    } else if (this.countRecorded() < this.countTotal()) {
      return 'warning';
    } else {
      return 'success';
    }
  });

}
