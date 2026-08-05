import {inject, Service} from '@angular/core';
import {ActivatedRouteSnapshot} from '@angular/router';
import {DistributionApiService, DistributionListResponse} from '../../../api/distribution-api.service';
import {Observable} from 'rxjs';

@Service()
export class CustomerOverviewDistributionsResolver {
  private readonly distributionApiService = inject(DistributionApiService);

  public resolve(_route: ActivatedRouteSnapshot): Observable<DistributionListResponse> {
    return this.distributionApiService.getDistributions();
  }

}
