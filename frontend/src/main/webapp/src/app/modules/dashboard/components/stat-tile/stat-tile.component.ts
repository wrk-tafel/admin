import {Component, input} from '@angular/core';
import {MatCard, MatCardContent} from '@angular/material/card';

@Component({
  selector: 'tafel-stat-tile',
  templateUrl: 'stat-tile.component.html',
  imports: [
    MatCard,
    MatCardContent
  ]
})
export class StatTileComponent {
  testId = input.required<string>();
  label = input.required<string>();
  value = input<number | null>(null);
}
