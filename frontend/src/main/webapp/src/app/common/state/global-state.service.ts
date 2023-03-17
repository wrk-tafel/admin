import {Injectable} from '@angular/core';
import {DistributionApiService, DistributionItem} from '../../api/distribution-api.service';
import {BehaviorSubject} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GlobalStateService {

  private currentDistribution: BehaviorSubject<DistributionItem> = new BehaviorSubject(null);

  constructor(
    private distributionApiService: DistributionApiService
  ) {
  }

  init(): Promise<any> {
    return this.getCurrentDistributionPromise();
  }

  private getCurrentDistributionPromise(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.distributionApiService.getCurrentDistribution()
        .subscribe(
          distributionItem => {
            this.currentDistribution.next(distributionItem);
            resolve(distributionItem);
          },
          error => {
            reject(error);
          });
    });
  }

  getCurrentDistribution(): BehaviorSubject<DistributionItem> {
    return this.currentDistribution;
  }

}
