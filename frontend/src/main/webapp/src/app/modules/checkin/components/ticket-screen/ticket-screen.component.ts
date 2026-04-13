import {Component, computed, inject, Signal} from '@angular/core';
import {SseService} from '../../../../common/sse/sse.service';
import {toSignal} from '@angular/core/rxjs-interop';

@Component({
    selector: 'tafel-ticket-screen',
    templateUrl: 'ticket-screen.component.html'
})
export class TicketScreenComponent {
  private readonly sseService = inject(SseService);

  private readonly ticketScreenData: Signal<TicketScreenText | undefined> = toSignal(
    this.sseService.listen<TicketScreenText>('/sse/distributions/ticket-screen/current')
  );

  readonly text = computed(() => this.ticketScreenData()?.text ?? undefined);
  readonly value = computed(() => this.ticketScreenData()?.value ?? '-');

}

export interface TicketScreenText {
  text: string;
  value: string;
}
