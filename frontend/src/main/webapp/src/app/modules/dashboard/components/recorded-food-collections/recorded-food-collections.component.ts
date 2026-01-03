import {Component, computed, inject, input, OnDestroy, OnInit, signal} from '@angular/core';
import {ButtonDirective, CardBodyComponent, CardComponent, ColComponent, Colors, RowComponent} from '@coreui/angular';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {TafelIfDistributionActiveDirective} from '../../../../common/directive/tafel-if-distribution-active.directive';
import {DistributionItem} from '../../../../api/distribution-api.service';
import {GlobalStateService} from '../../../../common/state/global-state.service';
import {Subscription} from 'rxjs';

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
export class RecordedFoodCollectionsComponent implements OnInit, OnDestroy {
  countRecorded = input<number | null>(null);
  countTotal = input<number | null>(null);

  private readonly globalStateService = inject(GlobalStateService);
  private distributionSubscription: Subscription;
  distribution = signal<DistributionItem>(null);

  panelColor = computed<Colors>(() => {
    if (!this.distribution()) {
      return 'primary';
    } else if (this.countRecorded() < this.countTotal()) {
      return 'warning';
    } else {
      return 'success';
    }
  });

  ngOnInit(): void {
    this.distributionSubscription = this.globalStateService.getCurrentDistribution().subscribe((distribution) => {
      this.distribution.set(distribution);
    });
  }

  ngOnDestroy(): void {
    if (this.distributionSubscription) {
      this.distributionSubscription.unsubscribe();
    }
  }

}
