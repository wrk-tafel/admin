import {Component, input} from '@angular/core';
import {
  ButtonDirective,
  CardBodyComponent,
  CardComponent,
  CardFooterComponent,
  ColComponent,
  Colors,
  RowComponent
} from '@coreui/angular';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {TafelIfDistributionActiveDirective} from '../../../../common/directive/tafel-if-distribution-active.directive';

@Component({
  selector: 'tafel-tickets-processed',
  templateUrl: 'tickets-processed.component.html',
  imports: [
    CardComponent,
    CardBodyComponent,
    RowComponent,
    ColComponent,
    FaIconComponent,
    ButtonDirective,
    TafelIfDistributionActiveDirective,
    CardFooterComponent
  ],
  standalone: true
})
export class TicketsProcessedComponent {
  countProcessedTickets = input<number>();
  countTotalTickets = input<number>();

  getPanelColor(): Colors {
    const processed = this.countProcessedTickets();
    const total = this.countTotalTickets();

    if (!processed && !total) {
      return 'primary';
    } else if (processed < total) {
      return 'warning';
    } else {
      return 'success';
    }
  }

}
