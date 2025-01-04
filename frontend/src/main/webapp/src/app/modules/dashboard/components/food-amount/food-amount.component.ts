import {Component, input} from '@angular/core';
import {ButtonDirective, CardBodyComponent, CardComponent, ColComponent, RowComponent} from '@coreui/angular';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {TafelIfDistributionActiveDirective} from '../../../../common/directive/tafel-if-distribution-active.directive';

@Component({
  selector: 'tafel-food-amount',
  templateUrl: 'food-amount.component.html',
  imports: [
    CardComponent,
    CardBodyComponent,
    RowComponent,
    ColComponent,
    FaIconComponent,
    ButtonDirective,
    TafelIfDistributionActiveDirective,
  ],
  standalone: true
})
export class FoodAmountComponent {
  amount = input<number | null>(null);
}
