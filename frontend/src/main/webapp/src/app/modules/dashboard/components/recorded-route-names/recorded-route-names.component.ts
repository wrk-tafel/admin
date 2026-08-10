import {Component, input} from '@angular/core';
import {MatCard, MatCardContent} from '@angular/material/card';

@Component({
  selector: 'tafel-recorded-route-names',
  templateUrl: 'recorded-route-names.component.html',
  imports: [
    MatCard,
    MatCardContent
  ]
})
export class RecordedRouteNamesComponent {
  recordedRouteNames = input<string[] | null>(null);
}
