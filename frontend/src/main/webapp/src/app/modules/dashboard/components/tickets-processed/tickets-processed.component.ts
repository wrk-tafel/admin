import {Component, computed, input} from '@angular/core';
import {MatCard, MatCardHeader, MatCardTitle, MatCardContent} from '@angular/material/card';

@Component({
  selector: 'tafel-tickets-processed',
  templateUrl: 'tickets-processed.component.html',
  imports: [
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent
  ]
})
export class TicketsProcessedComponent {
  countProcessedTickets = input<number>();
  countTotalTickets = input<number>();

  panelColor = computed<string>(() => {
    const processed = this.countProcessedTickets();
    const total = this.countTotalTickets();

    if (!processed && !total) {
      return 'primary';
    } else if (processed < total) {
      return 'warning';
    } else {
      return 'success';
    }
  });

}
