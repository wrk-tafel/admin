import {Injectable} from '@angular/core';
import {DistributionApiService, DistributionItem} from '../../api/distribution-api.service';
import {BehaviorSubject} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GlobalStateService {
  private readonly currentDistribution: BehaviorSubject<DistributionItem> = new BehaviorSubject(null);

  constructor(private readonly distributionApiService: DistributionApiService) {
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  init(): Promise<any> {
    return this.getCurrentDistributionPromise();
  }

  getCurrentDistribution(): BehaviorSubject<DistributionItem> {
    return this.currentDistribution;
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  private getCurrentDistributionPromise(): Promise<any> {
    return new Promise((resolve, reject) => {

      /* eslint-disable @typescript-eslint/no-empty-function */
      /* eslint-disable @typescript-eslint/no-unused-vars */
      const observer = {
        next: (distributionItem: DistributionItem) => {
          this.currentDistribution.next(distributionItem);
          resolve(distributionItem);
        },
        error: error => reject(error),
      };

      this.distributionApiService.getCurrentDistribution().subscribe(observer);
    });
  }

}
