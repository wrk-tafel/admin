import {Component, inject, input, OnInit} from '@angular/core';
import {ButtonDirective, CardBodyComponent, CardComponent, ColComponent, Colors, RowComponent} from '@coreui/angular';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {TafelIfDistributionActiveDirective} from '../../../../common/directive/tafel-if-distribution-active.directive';
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
    FaIconComponent,
    ButtonDirective,
    TafelIfDistributionActiveDirective
  ],
  standalone: true
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
