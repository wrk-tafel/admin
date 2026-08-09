import {Component, computed, inject, Signal, signal} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faLinkSlash} from '@fortawesome/free-solid-svg-icons';
import {SseService} from '../../../../common/sse/sse.service';
import {toSignal} from '@angular/core/rxjs-interop';

@Component({
    selector: 'tafel-ticket-screen',
    templateUrl: 'ticket-screen.component.html',
    imports: [FaIconComponent]
})
export class TicketScreenComponent {
  private readonly sseService = inject(SseService);

  // This fullscreen kiosk display has no header/layout chrome (see app.routes.ts), so unlike
  // every other authenticated screen it gets no "Live-Verbindung" badge for free - without this,
  // a dropped connection during the ~12h unattended Saturday event would look identical to "no
  // ticket called yet", with nothing on screen telling on-site staff it's actually stale.
  readonly connected = signal(true);

  private readonly ticketScreenData: Signal<TicketScreenText | undefined> = toSignal(
    this.sseService.listen<TicketScreenText>('/sse/distributions/ticket-screen/current', (connected) => this.connected.set(connected))
  );

  readonly text = computed(() => this.ticketScreenData()?.text ?? undefined);
  readonly value = computed(() => this.ticketScreenData()?.value ?? '-');

  protected readonly faLinkSlash = faLinkSlash;

}

export interface TicketScreenText {
  text: string;
  value: string;
}
