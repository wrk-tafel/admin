import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot} from '@angular/router';
import {Observable} from 'rxjs';
import {CustomerNoteApiService, CustomerNoteItem} from '../../../api/customer-note-api.service';
import {map} from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class CustomerNotesResolver {

  constructor(
    private customerNoteApiService: CustomerNoteApiService
  ) {
  }

  public resolve(route: ActivatedRouteSnapshot): Observable<CustomerNoteItem[]> {
    const customerId = +route.params['id'];
    return this.customerNoteApiService.getNotesForCustomer(customerId).pipe(map(response => response.notes));
  }

}
