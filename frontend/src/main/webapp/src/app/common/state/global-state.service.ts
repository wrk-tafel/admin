import {Injectable} from '@angular/core';
import {DistributionItem, DistributionItemUpdate} from '../../api/distribution-api.service';
import {BehaviorSubject} from 'rxjs';
import {SseService} from '../sse/sse.service';

@Injectable({
  providedIn: 'root'
})
export class GlobalStateService {
  private readonly currentDistribution: BehaviorSubject<DistributionItem> = new BehaviorSubject(null);
  private readonly connectionState: BehaviorSubject<boolean> = new BehaviorSubject(false);

  constructor(
    private readonly sseService: SseService
  ) {
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  init() {
    /* eslint-disable @typescript-eslint/no-empty-function */
    /* eslint-disable @typescript-eslint/no-unused-vars */
    const observer = {
      next: (distributionUpdate: DistributionItemUpdate) => {
        const distributionItem = distributionUpdate.distribution;
        this.currentDistribution.next(distributionItem);
      }
    };

    const connectionStateCallback = (connected: boolean) => {
      this.connectionState.next(connected);
    };
    this.sseService.listen('/sse/distributions', connectionStateCallback).subscribe(observer);
  }

  getCurrentDistribution(): BehaviorSubject<DistributionItem> {
    return this.currentDistribution;
  }

  getConnectionState(): BehaviorSubject<boolean> {
    return this.connectionState;
  }

}
