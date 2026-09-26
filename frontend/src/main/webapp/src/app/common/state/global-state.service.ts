import {inject, Service, Signal, WritableSignal, signal} from '@angular/core';
import {Subscription} from 'rxjs';
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
  private readonly _registeredCustomers: WritableSignal<number | null> = signal(null);

  private subscription: Subscription | null = null;

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
   * Keeps at most one connection open, however often it is called. The resolver runs again every
   * time the authenticated layout is entered - so once per login, and a logout/login round trip in
   * the same tab goes through it again - while this service is root-scoped and survives all of
   * that, so a second subscription here would be a second `EventSource` that nothing ever closes.
   * Browsers cap an origin at six concurrent HTTP/1.1 connections, and a permanently open SSE
   * stream holds one for good: a few of those leaked and the tab ran out of connections entirely,
   * leaving every later request - API calls, images, even a reload - queued until the reverse
   * proxy answered 504. Reconnecting after a drop is
   * `SseService`'s job (see `common/sse/sse.service.ts`), not a reason to subscribe again.
   * {@link reset} closes the connection, so the next call after a logout opens a new one.
   */
  init() {
    if (this.subscription) {
      return;
    }

    const connectionStateCallback = (connected: boolean) => {
      this._connectionState.set(connected);
    };

    // Subscribe to SSE and update the signal
    this.subscription = this.sseService.listen<DistributionItemUpdate>('/sse/distributions', connectionStateCallback).subscribe({
      next: (distributionUpdate: DistributionItemUpdate) => {
        const distributionItem = distributionUpdate.distribution;
        // The server re-sends this message whenever the registered-customer count changes. A new
        // object for an unchanged distribution would re-run every effect keyed on it - some of
        // which reset a form the user is typing into - so it is only replaced when it really changed.
        if (!this.isSameDistribution(this._currentDistribution(), distributionItem)) {
          this._currentDistribution.set(distributionItem);
        }
        // A start event carries no count and can arrive after newer counts; only a closed
        // distribution clears it, and a count only ever replaces the previous one.
        if (!distributionItem) {
          this._registeredCustomers.set(null);
        } else if (distributionUpdate.registeredCustomers != null) {
          this._registeredCustomers.set(distributionUpdate.registeredCustomers);
        }
        this._hasReceivedDistribution.set(true);
      }
    });
  }

  getCurrentDistribution(): Signal<DistributionItem | null> {
    return this._currentDistribution.asReadonly();
  }

  /**
   * Households registered for the open distribution, pushed on the same `/sse/distributions` stream
   * so the header can show it on every screen without a stream of its own. `null` while no
   * distribution is open or before the first message.
   */
  getRegisteredCustomers(): Signal<number | null> {
    return this._registeredCustomers.asReadonly();
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
   * Closes the `/sse/distributions` stream and drops the last-known distribution snapshot. Call
   * this from {@link AuthenticationService#logout}.
   *
   * The stream has to go with the snapshot: the server sends the current state once, when a stream
   * opens, and after that only what changes. Clearing the snapshot but keeping the stream open would
   * leave a re-login in the same tab with no distribution at all - shown as "closed" - until the
   * next start or close, however long that takes. Closing it means the next {@link init}, which the
   * layout resolver calls on every login, opens a new stream and gets the state straight away; it
   * also stops a logged-out tab from retrying a stream the server refuses with a 401.
   */
  reset(): void {
    this.subscription?.unsubscribe();
    this.subscription = null;
    this._connectionState.set(false);
    this._currentDistribution.set(null);
    this._registeredCustomers.set(null);
    this._hasReceivedDistribution.set(false);
  }

  private isSameDistribution(current: DistributionItem | null, next: DistributionItem | null): boolean {
    if (current === null || next === null) {
      return current === next;
    }
    return current.id === next.id && !!current.endedAt === !!next.endedAt;
  }

}
