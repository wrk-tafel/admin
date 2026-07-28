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


  /**
   * Starts the `/sse/distributions` subscription. Called once from `default-layout-resolver`
   * (which runs for every authenticated route) before any consumer reads {@link getCurrentDistribution}/
   * {@link getConnectionState} - until the first SSE message arrives, `getCurrentDistribution()`
   * stays `null`, which looks identical to "no distribution is open". Consumers that need to tell
   * "not loaded yet" apart from "confirmed closed" should gate on {@link getConnectionState}.
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
      }
    });
  }

  getCurrentDistribution(): Signal<DistributionItem | null> {
    return this._currentDistribution.asReadonly();
  }

  getConnectionState(): Signal<boolean> {
    return this._connectionState.asReadonly();
  }

}
