import {Component, input} from '@angular/core';
import {MatCard, MatCardContent} from '@angular/material/card';

@Component({
  selector: 'tafel-registered-persons',
  templateUrl: 'registered-persons.component.html',
  imports: [
    MatCard,
    MatCardContent
  ]
})
export class RegisteredPersonsComponent {
  count = input<number>();
}
