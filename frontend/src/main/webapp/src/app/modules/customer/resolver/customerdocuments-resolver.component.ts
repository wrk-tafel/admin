import {inject, Service} from '@angular/core';
import {ActivatedRouteSnapshot} from '@angular/router';
import {Observable, of} from 'rxjs';
import {CustomerDocumentApiService, CustomerDocumentsResponse} from '../../../api/customer-document-api.service';
import {AuthenticationService} from '../../../common/security/authentication.service';

@Service()
export class CustomerDocumentsResolver {
  private customerDocumentApiService = inject(CustomerDocumentApiService);
  private authenticationService = inject(AuthenticationService);

  // CUSTOMER doesn't imply CUSTOMER_DOCUMENTS (GDPR G7, issue #3181) - without this check, a user
  // holding only CUSTOMER would have the whole customer detail page's navigation fail on this
  // resolver's 403 instead of just not seeing the documents tab.
  public resolve(route: ActivatedRouteSnapshot): Observable<CustomerDocumentsResponse> {
    if (!this.authenticationService.hasPermission('CUSTOMER_DOCUMENTS')) {
      return of({items: []});
    }

    const customerId = +route.params['id'];
    return this.customerDocumentApiService.getDocumentsForCustomer(customerId);
  }

}
