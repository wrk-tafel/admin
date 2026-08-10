import {Component, computed, input} from '@angular/core';
import {MatCard, MatCardContent} from '@angular/material/card';

@Component({
  selector: 'tafel-tickets-processed',
  templateUrl: 'tickets-processed.component.html',
  imports: [
    MatCard,
    MatCardContent
  ]
})
export class TicketsProcessedComponent {
  countProcessedTickets = input<number | null>(null);
  countTotalTickets = input<number | null>(null);

  panelColor = computed<string>(() => {
    const processed = this.countProcessedTickets();
    const total = this.countTotalTickets();

    if (!processed && !total) {
      return 'primary';
    } else if ((processed ?? 0) < (total ?? 0)) {
      return 'warning';
    } else {
      return 'success';
    }
  });

}
