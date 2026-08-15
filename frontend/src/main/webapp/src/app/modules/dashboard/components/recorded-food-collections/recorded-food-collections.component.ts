import {Component, computed, inject, input, Signal} from '@angular/core';
import {MatCard, MatCardContent} from '@angular/material/card';
import {DistributionItem} from '../../../../api/distribution-api.service';
import {GlobalStateService} from '../../../../common/state/global-state.service';

@Component({
  selector: 'tafel-recorded-food-collections',
  templateUrl: 'recorded-food-collections.component.html',
  imports: [
    MatCard,
    MatCardContent
  ]
})
export class RecordedFoodCollectionsComponent {
  countRecorded = input<number | null>(null);
  countTotal = input<number | null>(null);

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

  // Same reasoning as TicketsProcessedComponent.percentProcessed: a ratio reads faster as a bar
  // than as two numbers, and `null` (not 0) is what suppresses the bar before a total exists.
  percentRecorded = computed<number | null>(() => {
    const recorded = this.countRecorded();
    const total = this.countTotal();
    if (!total) {
      return null;
    }
    return Math.min(100, Math.round(((recorded ?? 0) / total) * 100));
  });

}
