import {Component, DestroyRef, inject, OnInit, signal} from '@angular/core';
import {DOCUMENT} from '@angular/common';
import {ActivatedRoute} from '@angular/router';
import {MatIcon} from '@angular/material/icon';
import {TicketScreenComponent} from '../../components/ticket-screen/ticket-screen.component';
import {registerSvgIcons} from '../../../../common/util/svg-icon.util';
import fullscreenIcon from '@material-symbols/svg-400/outlined/fullscreen.svg';

@Component({
    selector: 'tafel-ticket-screen-fullscreen',
    templateUrl: 'ticket-screen-fullscreen.component.html',
    imports: [
        TicketScreenComponent,
        MatIcon
    ]
})
export class TicketScreenFullscreenComponent implements OnInit {
  private readonly registerIcons = registerSvgIcons({fullscreen: fullscreenIcon});

  private readonly document = inject(DOCUMENT);
  private readonly window = inject(Window);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  // Opt-in via the URL (?sound=1) rather than on by default: a chime is only wanted in rooms
  // where the monitor hangs out of direct view, and this is the one route that ever sets it - the
  // control screen's own embedded live preview is a different component instance entirely.
  readonly soundEnabled = this.route.snapshot.queryParamMap.get('sound') === '1';

  readonly fullscreenSupported = typeof this.document.documentElement.requestFullscreen === 'function';
  // Fades out once fullscreen was actually entered - browser chrome on a public display looks
  // broken, so the control to fix that shouldn't linger once it's done its job.
  readonly showFullscreenButton = signal(true);

  private wakeLockSentinel: WakeLockSentinel | null = null;

  ngOnInit() {
    void this.requestWakeLock();

    // A wake lock is released by the browser whenever the tab is backgrounded, so it has to be
    // re-requested every time the tab becomes visible again - otherwise the screen can still blank
    // after the first tab switch of the day.
    const onVisibilityChange = () => {
      if (this.document.visibilityState === 'visible') {
        void this.requestWakeLock();
      }
    };
    this.document.addEventListener('visibilitychange', onVisibilityChange);

    // Exiting fullscreen (Esc, or an OS gesture) brings the browser chrome back - offer the
    // button again instead of leaving the display with no way back short of a reload.
    const onFullscreenChange = () => {
      if (!this.document.fullscreenElement) {
        this.showFullscreenButton.set(true);
      }
    };
    this.document.addEventListener('fullscreenchange', onFullscreenChange);

    this.destroyRef.onDestroy(() => {
      this.document.removeEventListener('visibilitychange', onVisibilityChange);
      this.document.removeEventListener('fullscreenchange', onFullscreenChange);
      void this.wakeLockSentinel?.release();
    });
  }

  async enterFullscreen() {
    try {
      await this.document.documentElement.requestFullscreen();
      this.showFullscreenButton.set(false);
    } catch (error) {
      // Most likely no user-activation context yet, or a kiosk browser that disables the API
      // outright - leave the button up rather than hide a control the click did nothing for.
      console.warn('Could not enter fullscreen', error);
    }
  }

  private async requestWakeLock() {
    const navigator = this.window.navigator as Navigator & {wakeLock?: WakeLock};
    if (!navigator.wakeLock) {
      return;
    }
    try {
      this.wakeLockSentinel = await navigator.wakeLock.request('screen');
    } catch (error) {
      // Most likely battery saver, or the tab was backgrounded again before the request settled -
      // the visibilitychange listener above retries this the next time the tab is foregrounded.
      console.warn('Could not acquire screen wake lock', error);
    }
  }
}
