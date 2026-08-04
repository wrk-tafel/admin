import {inject, Service} from '@angular/core';
import {ActivatedRouteSnapshot} from '@angular/router';
import {CustomerApiService, CustomerMergePreview} from '../../../api/customer-api.service';
import {Observable} from 'rxjs';

@Service()
export class CustomerMergePreviewResolver {
  private readonly customerApiService = inject(CustomerApiService);

  public resolve(route: ActivatedRouteSnapshot): Observable<CustomerMergePreview> {
    const targetCustomerId = +route.params['id'];
    const sourceCustomerIds = (route.queryParams['quellen'] ?? '')
      .split(',')
      .filter((value: string) => value.length > 0)
      .map((value: string) => +value);

    return this.customerApiService.getMergePreview(targetCustomerId, sourceCustomerIds);
  }

}
