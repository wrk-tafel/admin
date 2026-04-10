import {Component, input} from '@angular/core';
import {MatCard, MatCardHeader, MatCardTitle, MatCardContent} from '@angular/material/card';
import {DecimalPipe} from '@angular/common';

@Component({
  selector: 'tafel-food-amount',
  templateUrl: 'food-amount.component.html',
  imports: [
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    DecimalPipe
  ]
})
export class FoodAmountComponent {
  amount = input<number | null>(null);
}