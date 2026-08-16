import {Component, computed, DestroyRef, effect, inject, input, signal, Signal} from '@angular/core';
import {DatePipe} from '@angular/common';
import {MatIcon} from '@angular/material/icon';
import {SseService} from '../../../../common/sse/sse.service';
import {toSignal} from '@angular/core/rxjs-interop';
import {registerSvgIcons} from '../../../../common/util/svg-icon.util';
import linkOffIcon from '@material-symbols/svg-400/outlined/link_off.svg';

// Mirrors DistributionTicketScreenController.TICKET_SCREEN_TITLE (backend). The "previous ticket"
// caption and the optional chime only make sense while an actual ticket number is on screen, not
// while a "Startzeit" announcement is shown - showText() reuses the same SSE payload shape for both.
const TICKET_CAPTION = 'Ticket';

// How long the scale/flash plays before the digits settle back to their resting size.
const CHANGE_ANIMATION_DURATION_MILLIS = 700;

@Component({
    selector: 'tafel-ticket-screen',
    templateUrl: 'ticket-screen.component.html',
    styleUrl: 'ticket-screen.component.scss',
    imports: [MatIcon, DatePipe]
})
export class TicketScreenComponent {
  private readonly registerIcons = registerSvgIcons({link_off: linkOffIcon});

  private readonly sseService = inject(SseService);
  private readonly destroyRef = inject(DestroyRef);

  // Opt-in via the fullscreen route's `?sound=1` query param (see TicketScreenFullscreenComponent).
  // Off by default - a chime is only wanted in rooms where the monitor hangs out of direct view,
  // and the control screen's embedded live preview never sets this.
  readonly soundEnabled = input(false);

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

  // Stamped on every message, including the resend a fresh SSE connection gets right after
  // reconnecting - so a stale display can say exactly how stale it is rather than just "disconnected".
  readonly lastUpdateAt = signal<Date | null>(null);

  // The previously called ticket number, so someone who glanced away for a moment can self-serve
  // instead of waiting for staff to notice. Tracked only while a ticket (not a "Startzeit"
  // announcement) is shown, and cleared whenever the caption switches away from one.
  readonly previousTicketValue = signal<string | null>(null);
  private lastTicketValue: string | null = null;

  // Briefly true right after the displayed value changes, driving the scale/flash CSS animation -
  // peripheral vision catches a moving/flashing shape far more readily than reading new digits.
  readonly justChanged = signal(false);
  private changeAnimationTimeoutId: ReturnType<typeof setTimeout> | null = null;

  private audioContext: AudioContext | null = null;

  constructor() {
    effect(() => {
      const data = this.ticketScreenData();
      if (!data) {
        return;
      }
      this.lastUpdateAt.set(new Date());

      const isTicket = data.text === TICKET_CAPTION;
      const newValue = data.value ?? '-';

      if (!isTicket) {
        this.lastTicketValue = null;
        this.previousTicketValue.set(null);
        return;
      }

      if (this.lastTicketValue !== null && this.lastTicketValue !== newValue) {
        this.previousTicketValue.set(this.lastTicketValue);
        this.triggerChangeAnimation();
        if (this.soundEnabled()) {
          this.playChime();
        }
      }
      this.lastTicketValue = newValue;
    });

    this.destroyRef.onDestroy(() => {
      if (this.changeAnimationTimeoutId !== null) {
        clearTimeout(this.changeAnimationTimeoutId);
      }
      this.audioContext?.close().catch(() => undefined);
    });
  }

  private triggerChangeAnimation() {
    this.justChanged.set(false);
    if (this.changeAnimationTimeoutId !== null) {
      clearTimeout(this.changeAnimationTimeoutId);
    }
    // A macrotask between removing and re-adding the class, or the browser coalesces an "off/on"
    // within the same tick into nothing and the CSS animation never restarts for the next change.
    setTimeout(() => {
      this.justChanged.set(true);
      this.changeAnimationTimeoutId = setTimeout(() => this.justChanged.set(false), CHANGE_ANIMATION_DURATION_MILLIS);
    }, 0);
  }

  private playChime() {
    try {
      this.audioContext ??= new AudioContext();
      const context = this.audioContext;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.15, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.4);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.4);
    } catch (error) {
      // Best-effort: browser autoplay policies can block audio until the tab has seen a user
      // gesture (e.g. the fullscreen button), and the display must keep working either way.
      console.warn('Could not play ticket-screen chime', error);
    }
  }

}

export interface TicketScreenText {
  text: string;
  value: string;
}
