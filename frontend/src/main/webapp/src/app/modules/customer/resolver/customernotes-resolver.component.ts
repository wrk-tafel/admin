import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, Resolve, RouterStateSnapshot} from '@angular/router';
import {Observable} from 'rxjs';
import {CustomerNoteApiService, CustomerNoteItem} from '../../../api/customer-note-api.service';
import {map} from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class CustomerNotesResolver implements Resolve<CustomerNoteItem[]> {

  constructor(
    private customerNoteApiService: CustomerNoteApiService
  ) {
  }

  /* eslint-disable @typescript-eslint/no-unused-vars */
  public resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<CustomerNoteItem[]> {
    const customerId = +route.params['id'];
    return this.customerNoteApiService.getNotesForCustomer(customerId).pipe(map(response => response.notes));
  }

}
