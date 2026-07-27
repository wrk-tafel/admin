import {inject, Service} from '@angular/core';
import {ActivatedRouteSnapshot} from '@angular/router';
import {CustomerAboveLimitResponse, CustomerApiService} from '../../../api/customer-api.service';
import {Observable} from 'rxjs';

@Service()
export class CustomerAboveLimitDataResolver {
  private readonly customerApiService = inject(CustomerApiService);

  public resolve(_route: ActivatedRouteSnapshot): Observable<CustomerAboveLimitResponse> {
    return this.customerApiService.getCustomersAboveLimit();
  }

}
