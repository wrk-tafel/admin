import {Component, inject, input, OnInit} from '@angular/core';
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
        ColComponent,
    ]
})
export class RecordedFoodCollectionsComponent implements OnInit {
  countRecorded = input<number | null>(null);
  countTotal = input<number | null>(null);

  private readonly globalStateService = inject(GlobalStateService);
  distribution: DistributionItem;

  ngOnInit(): void {
    this.globalStateService.getCurrentDistribution().subscribe((distribution) => {
      this.distribution = distribution;
    });
  }

  getPanelColor(): Colors {
    if (!this.distribution) {
      return 'primary';
    } else if (this.countRecorded() < this.countTotal()) {
      return 'warning';
    } else {
      return 'success';
    }
  }

}
