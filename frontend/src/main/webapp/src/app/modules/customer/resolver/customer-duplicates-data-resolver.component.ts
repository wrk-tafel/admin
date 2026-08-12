import {inject, Service} from '@angular/core';
import {ActivatedRouteSnapshot} from '@angular/router';
import {CustomerApiService, CustomerDuplicatesResponse} from '../../../api/customer-api.service';
import {Observable} from 'rxjs';

@Service()
export class CustomerDuplicatesDataResolver {
  private readonly customerApiService = inject(CustomerApiService);

  /**
   * `?seite=` is what the merge screen's "Abbrechen" comes back with (see
   * `CustomerDuplicatesComponent.startMerge`), so an abandoned merge returns to the candidate it
   * was started from rather than to the first page of the queue.
   */
  public resolve(route: ActivatedRouteSnapshot): Observable<CustomerDuplicatesResponse> {
    const page = +route.queryParams?.['seite'];
    return this.customerApiService.getCustomerDuplicates(page > 0 ? page : undefined);
  }

}
