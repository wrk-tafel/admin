import {inject, Service} from '@angular/core';
import {ActivatedRouteSnapshot} from '@angular/router';
import {CustomerApiService, CustomerOverviewResponse} from '../../../api/customer-api.service';
import {Observable} from 'rxjs';

@Service()
export class CustomerOverviewDataResolver {
  private readonly customerApiService = inject(CustomerApiService);

  public resolve(_route: ActivatedRouteSnapshot): Observable<CustomerOverviewResponse> {
    return this.customerApiService.getCustomersOverview();
  }

}
