import {Component, inject, OnDestroy, OnInit} from '@angular/core';
import {BgColorDirective, ColComponent, ContainerComponent, RowComponent} from '@coreui/angular';
import {SseService} from '../../../../common/sse/sse.service';
import {Subscription} from 'rxjs';

@Component({
    selector: 'tafel-ticket-screen',
    templateUrl: 'ticket-screen.component.html',
    imports: [
        ContainerComponent,
        RowComponent,
        ColComponent,
        BgColorDirective
    ]
})
export class TicketScreenComponent implements OnInit, OnDestroy {
  private readonly sseService = inject(SseService);
  private ticketScreenSubscription: Subscription;

  text: string;
  value: string;

  ngOnInit(): void {
    this.ticketScreenSubscription = this.sseService.listen('/sse/distributions/ticket-screen/current').subscribe((response: TicketScreenText) => {
      this.text = response.text;
      this.value = response.value;
    });
  }

  ngOnDestroy(): void {
    if (this.ticketScreenSubscription) {
      this.ticketScreenSubscription.unsubscribe();
    }
  }

}

export interface TicketScreenText {
  text: string;
  value: string;
}
