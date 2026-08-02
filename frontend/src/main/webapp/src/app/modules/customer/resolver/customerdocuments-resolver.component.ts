import {inject, Service} from '@angular/core';
import {ActivatedRouteSnapshot} from '@angular/router';
import {Observable} from 'rxjs';
import {CustomerDocumentApiService, CustomerDocumentsResponse} from '../../../api/customer-document-api.service';

@Service()
export class CustomerDocumentsResolver {
  private customerDocumentApiService = inject(CustomerDocumentApiService);

  public resolve(route: ActivatedRouteSnapshot): Observable<CustomerDocumentsResponse> {
    const customerId = +route.params['id'];
    return this.customerDocumentApiService.getDocumentsForCustomer(customerId);
  }

}
