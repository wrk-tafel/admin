import {Injectable} from '@angular/core';
import {DistributionApiService, DistributionItem} from '../../api/distribution-api.service';
import {Observable, Subject} from 'rxjs';
import {map} from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class GlobalStateService {

  private currentDistribution: Subject<DistributionItem> = new Subject();

  constructor(
    private distributionApiService: DistributionApiService
  ) {
  }

  init() {
    this.initCurrentDistribution().subscribe();

    Promise.all([this.currentDistribution.toPromise()]);
  }

  private initCurrentDistribution(): Observable<DistributionItem> {
    return this.distributionApiService.getCurrentDistribution().pipe(map(distributionItem => {
      this.currentDistribution.next(distributionItem);
      return distributionItem;
    }));
  }

  getCurrentDistribution(): Subject<DistributionItem> {
    return this.currentDistribution;
  }

}
