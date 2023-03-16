import {Injectable} from '@angular/core';
import {DistributionApiService, DistributionItem} from '../../api/distribution-api.service';
import {BehaviorSubject, Observable} from 'rxjs';
import {map} from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class GlobalStateService {

  private currentDistribution: BehaviorSubject<DistributionItem> = new BehaviorSubject(null);

  constructor(
    private distributionApiService: DistributionApiService
  ) {
  }

  init() {
    // TODO improve
    this.initCurrentDistribution().subscribe();

    Promise.all([this.currentDistribution.toPromise()]);
  }

  private initCurrentDistribution(): Observable<DistributionItem> {
    return this.distributionApiService.getCurrentDistribution().pipe(map(distributionItem => {
      this.currentDistribution.next(distributionItem);
      return distributionItem;
    }));
  }

  getCurrentDistribution(): BehaviorSubject<DistributionItem> {
    return this.currentDistribution;
  }

}
