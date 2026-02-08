import {Component, computed, input} from '@angular/core';
import {
  CardBodyComponent,
  CardComponent,
  ColComponent,
  Colors,
  RowComponent
} from '@coreui/angular';

@Component({
    selector: 'tafel-tickets-processed',
    templateUrl: 'tickets-processed.component.html',
    imports: [
        CardComponent,
        CardBodyComponent,
        RowComponent,
        ColComponent
    ]
})
export class TicketsProcessedComponent {
  countProcessedTickets = input<number>();
  countTotalTickets = input<number>();

  panelColor = computed<Colors>(() => {
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
