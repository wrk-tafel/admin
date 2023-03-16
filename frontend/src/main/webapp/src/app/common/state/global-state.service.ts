import {Injectable} from '@angular/core';
import {DistributionApiService, DistributionItem} from '../../api/distribution-api.service';
import {Observable, Subject} from 'rxjs';
import {map} from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class GlobalStateService {

  currentDistribution: Subject<DistributionItem> = new Subject();

  constructor(
    private distributionApiService: DistributionApiService
  ) {
  }

  init() {
    this.getCurrentDistribution().subscribe();

    return Promise.all([this.currentDistribution.toPromise()]);
  }

  private getCurrentDistribution(): Observable<DistributionItem> {
    return this.distributionApiService.getCurrentDistribution().pipe(map(distributionItem => {
      this.currentDistribution.next(distributionItem);
      return distributionItem;
    }));
  }

}
