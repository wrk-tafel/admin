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


  /**
   * Starts the `/sse/distributions` subscription. Called once from `default-layout-resolver`
   * (which runs for every authenticated route) before any consumer reads {@link getCurrentDistribution}/
   * {@link getConnectionState}/{@link getHasReceivedDistribution} - until the first SSE message
   * arrives, `getCurrentDistribution()` stays `null`, which looks identical to "no distribution is
   * open". {@link getConnectionState} reflects the underlying socket (`onopen`), which can flip to
   * `true` a tick before the first message is actually processed - it is NOT a reliable proxy for
   * "the initial snapshot has arrived". Consumers that need to tell "not loaded yet" apart from
   * "confirmed closed" must gate on {@link getHasReceivedDistribution} instead.
   */
  init() {
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

}
