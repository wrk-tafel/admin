import {inject, Service, signal, Signal} from '@angular/core';

/**
 * App-wide "is the browser online" state, backed by `navigator.onLine` and the `online`/`offline`
 * window events. This only reflects whether the device has *a* network connection, not whether
 * the backend is actually reachable - callers that need to distinguish "no network" from "network
 * present but backend unreachable" (e.g. a captive portal) should still handle request failures
 * themselves; this is meant as a cheap, immediate signal for UI and for deciding when to attempt
 * flushing queued offline writes.
 */
@Service()
export class ConnectivityService {
  private readonly window = inject(Window);

  private readonly _isOnline = signal(this.window.navigator.onLine);

  constructor() {
    this.window.addEventListener('online', () => this._isOnline.set(true));
    this.window.addEventListener('offline', () => this._isOnline.set(false));
  }

  isOnline(): Signal<boolean> {
    return this._isOnline.asReadonly();
  }
}
