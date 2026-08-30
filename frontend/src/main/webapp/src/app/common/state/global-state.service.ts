import {inject, Service, Signal, WritableSignal, signal} from '@angular/core';
import {DistributionItem, DistributionItemUpdate} from '../../api/distribution-api.service';
import {SseService} from '../sse/sse.service';

/**
 * App-wide "is a distribution currently open" state, kept in sync via a single shared SSE
 * subscription to `/sse/distributions` (see `common/sse/sse.service.ts`). Any module that needs
 * to know whether a distribution is active (checkin, logistics, dashboard, ...) should read it
 * from here rather than opening its own subscription or re-deriving the state locally, so they
 * all agree on the same value.
 */
@Service()
export class GlobalStateService {
  private readonly sseService = inject(SseService);

  private readonly _currentDistribution: WritableSignal<DistributionItem | null> = signal(null);
  private readonly _connectionState: WritableSignal<boolean> = signal(false);
  private readonly _hasReceivedDistribution: WritableSignal<boolean> = signal(false);

  private subscribed = false;

  /**
   * Starts the `/sse/distributions` subscription. Called from `default-layout-resolver`, before any
   * consumer reads {@link getCurrentDistribution}/{@link getConnectionState}/
   * {@link getHasReceivedDistribution} - until the first SSE message arrives,
   * `getCurrentDistribution()` stays `null`, which looks identical to "no distribution is open".
   * {@link getConnectionState} reflects the underlying socket (`onopen`), which can flip to `true` a
   * tick before the first message is actually processed - it is NOT a reliable proxy for "the
   * initial snapshot has arrived". Consumers that need to tell "not loaded yet" apart from
   * "confirmed closed" must gate on {@link getHasReceivedDistribution} instead.
   *
   * Opens the connection at most once for the lifetime of the tab, however often it is called. The
   * resolver runs again every time the authenticated layout is entered - so once per login, and a
   * logout/login round trip in the same tab goes through it again - while this service is
   * root-scoped and survives all of that, so a second subscription here would be a second
   * `EventSource` that nothing ever closes. Browsers cap an origin at six concurrent HTTP/1.1
   * connections, and a permanently open SSE stream holds one for good: a few of those leaked and
   * the tab ran out of connections entirely, leaving every later request - API calls, images, even
   * a reload - queued until the reverse proxy answered 504. Reconnecting after a drop is
   * `SseService`'s job (see `common/sse/sse.service.ts`), not a reason to subscribe again.
   */
  init() {
    if (this.subscribed) {
      return;
    }
    this.subscribed = true;

    const connectionStateCallback = (connected: boolean) => {
      this._connectionState.set(connected);
    };

    // Subscribe to SSE and update the signal
    this.sseService.listen<DistributionItemUpdate>('/sse/distributions', connectionStateCallback).subscribe({
      next: (distributionUpdate: DistributionItemUpdate) => {
        const distributionItem = distributionUpdate.distribution;
        this._currentDistribution.set(distributionItem);
        this._hasReceivedDistribution.set(true);
      }
    });
  }

  getCurrentDistribution(): Signal<DistributionItem | null> {
    return this._currentDistribution.asReadonly();
  }

  getConnectionState(): Signal<boolean> {
    return this._connectionState.asReadonly();
  }

  /**
   * `true` once the first `/sse/distributions` message has actually been processed - unlike
   * {@link getConnectionState}, this can't flip to `true` before {@link getCurrentDistribution}
   * reflects real server state, so it's safe to gate "confirmed closed" redirects on.
   */
  getHasReceivedDistribution(): Signal<boolean> {
    return this._hasReceivedDistribution.asReadonly();
  }

  /**
   * Drops the last-known distribution snapshot without touching the `/sse/distributions`
   * subscription itself - that stream is deliberately kept open across a logout (see {@link init}).
   * Call this from {@link AuthenticationService#logout} so a re-login doesn't render the previous
   * session's snapshot (and can't trigger a "confirmed closed" redirect off stale data) for as long
   * as the backoff in `SseService` takes to deliver the next message.
   */
  reset(): void {
    this._currentDistribution.set(null);
    this._hasReceivedDistribution.set(false);
  }

}
