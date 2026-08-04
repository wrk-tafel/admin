import {Component, input} from '@angular/core';
import {MatCard, MatCardHeader, MatCardTitle, MatCardContent} from '@angular/material/card';

@Component({
  selector: 'tafel-recorded-route-names',
  templateUrl: 'recorded-route-names.component.html',
  imports: [
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent
  ]
})
export class RecordedRouteNamesComponent {
  recordedRouteNames = input<string[] | null>(null);
}
