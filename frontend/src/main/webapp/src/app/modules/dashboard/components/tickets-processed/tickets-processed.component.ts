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

  // "34/120" is a ratio, and a ratio reads faster as a filled-in bar than as two numbers someone
  // has to divide themselves - especially at a glance from across the room. Only rendered once a
  // total is known; a bar stuck at 0% before the first ticket exists would say nothing useful.
  percentProcessed = computed<number | null>(() => {
    const processed = this.countProcessedTickets();
    const total = this.countTotalTickets();
    if (!total) {
      return null;
    }
    return Math.min(100, Math.round(((processed ?? 0) / total) * 100));
  });

}
