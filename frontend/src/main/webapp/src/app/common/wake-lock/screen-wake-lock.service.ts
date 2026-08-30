import {inject, Service} from '@angular/core';

/**
 * Thin wrapper around the Screen Wake Lock API: keeps the device's screen from turning off while a
 * `request()` is held, and releases it again on `release()`. Written for the route guidance screen -
 * a phone in a cradle that locks between stops costs an unlock-and-navigate every time - but nothing
 * here is specific to it, so any other screen used the same way (read at the wheel, hands busy) can
 * reuse it.
 *
 * Wrapped rather than called directly so a screen doesn't have to guard `'wakeLock' in navigator`
 * itself, and so a unit test can substitute a fake `navigator`. The OS/browser can drop a lock on its
 * own (e.g. the tab going to the background) - this service only wraps the request/release pair,
 * callers that care about re-acquiring once the tab is visible again have to do that themselves (see
 * `RouteGuidanceComponent`'s `visibilitychange` listener).
 */
@Service()
export class ScreenWakeLockService {
  private readonly window = inject(Window);

  private sentinel?: WakeLockSentinel;

  get isSupported(): boolean {
    return 'wakeLock' in this.window.navigator;
  }

  async request(): Promise<void> {
    if (!this.isSupported || this.sentinel) {
      return;
    }

    try {
      this.sentinel = await this.window.navigator.wakeLock.request('screen');
      this.sentinel.addEventListener('release', () => {
        this.sentinel = undefined;
      });
    } catch {
      // e.g. permission denied, battery saver, no capable display - the screen just locks as usual,
      // there is nothing else to do about it here
      this.sentinel = undefined;
    }
  }

  async release(): Promise<void> {
    const sentinel = this.sentinel;
    if (!sentinel) {
      return;
    }

    this.sentinel = undefined;
    try {
      await sentinel.release();
    } catch {
      // already released, e.g. by the OS when the tab was backgrounded - nothing to do
    }
  }
}
