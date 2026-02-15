import {inject, Injectable, Signal, WritableSignal, signal} from '@angular/core';
import {DistributionItem, DistributionItemUpdate} from '../../api/distribution-api.service';
import {SseService} from '../sse/sse.service';
import {toSignal} from '@angular/core/rxjs-interop';
import {map} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GlobalStateService {
  private readonly sseService = inject(SseService);

  private readonly _currentDistribution: WritableSignal<DistributionItem> = signal(null);
  private readonly _connectionState: WritableSignal<boolean> = signal(false);

  /* eslint-disable @typescript-eslint/no-explicit-any */
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

  getCurrentDistribution(): Signal<DistributionItem> {
    return this._currentDistribution.asReadonly();
  }

  getConnectionState(): Signal<boolean> {
    return this._connectionState.asReadonly();
  }

}
