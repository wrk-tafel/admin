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
    console.log("GLOBAL INIT");
    this.getCurrentDistribution().subscribe();

    Promise.all([this.currentDistribution.toPromise()]);
  }

  private getCurrentDistribution(): Observable<DistributionItem> {
    return this.distributionApiService.getCurrentDistribution().pipe(map(distributionItem => {
      console.log("GLOBAL INIT - DIS", distributionItem);
      this.currentDistribution.next(distributionItem);
      return distributionItem;
    }));
  }

}
