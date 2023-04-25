import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, Resolve, RouterStateSnapshot} from '@angular/router';
import {Observable} from 'rxjs';
import {DistributionApiService, DistributionStatesResponse} from '../../../api/distribution-api.service';

@Injectable({
  providedIn: 'root'
})
export class DashboardResolver implements Resolve<DistributionStatesResponse> {

  constructor(
    private distributionApiService: DistributionApiService
  ) {
  }

  /* eslint-disable @typescript-eslint/no-unused-vars */
  public resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<DistributionStatesResponse> {
    return this.distributionApiService.getStates();
  }

}
