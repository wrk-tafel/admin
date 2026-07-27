import {inject, Service} from '@angular/core';
import {ActivatedRouteSnapshot} from '@angular/router';
import {CustomerAboveLimitItem, CustomerApiService} from '../../../api/customer-api.service';
import {Observable} from 'rxjs';

@Service()
export class CustomerAboveLimitDataResolver {
  private readonly customerApiService = inject(CustomerApiService);

  public resolve(_route: ActivatedRouteSnapshot): Observable<CustomerAboveLimitItem[]> {
    return this.customerApiService.getCustomersAboveLimit();
  }

}
