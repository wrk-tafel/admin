import {inject, Service} from '@angular/core';
import {ActivatedRouteSnapshot} from '@angular/router';
import {CustomerApiService, CustomerDuplicatesResponse} from '../../../api/customer-api.service';
import {Observable} from 'rxjs';

@Service()
export class CustomerDuplicatesDataResolver {
  private readonly customerApiService = inject(CustomerApiService);

  public resolve(_route: ActivatedRouteSnapshot): Observable<CustomerDuplicatesResponse> {
    return this.customerApiService.getCustomerDuplicates();
  }

}
