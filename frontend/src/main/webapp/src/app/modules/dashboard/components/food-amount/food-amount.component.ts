import {Component, input} from '@angular/core';
import {CardBodyComponent, CardComponent, ColComponent, RowComponent} from '@coreui/angular';
import {DecimalPipe} from '@angular/common';

@Component({
    selector: 'tafel-food-amount',
    templateUrl: 'food-amount.component.html',
    imports: [
        CardComponent,
        CardBodyComponent,
        RowComponent,
        ColComponent,
        DecimalPipe
    ]
})
export class FoodAmountComponent {
  amount = input<number | null>(null);
}
