import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {DistributionApiService, DistributionStatesResponse} from '../../../api/distribution-api.service';

@Injectable({
  providedIn: 'root'
})
export class DashboardResolver {

  constructor(
    private distributionApiService: DistributionApiService
  ) {
  }

  public resolve(): Observable<DistributionStatesResponse> {
    return this.distributionApiService.getStates();
  }

}
