import {inject, Injectable} from '@angular/core';
import {ActivatedRouteSnapshot} from '@angular/router';
import {Observable} from 'rxjs';
import {CustomerNoteApiService, CustomerNotesResponse} from '../../../api/customer-note-api.service';

@Injectable({
  providedIn: 'root'
})
export class CustomerNotesResolver {
  private customerNoteApiService = inject(CustomerNoteApiService);

  public resolve(route: ActivatedRouteSnapshot): Observable<CustomerNotesResponse> {
    const customerId = +route.params['id'];
    return this.customerNoteApiService.getNotesForCustomer(customerId);
  }

}
