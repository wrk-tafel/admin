import {inject, Injectable} from '@angular/core';
import {ActivatedRouteSnapshot} from '@angular/router';
import {CustomerApiService, CustomerDuplicatesResponse} from '../../../api/customer-api.service';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CustomerDuplicatesDataResolver {
  private readonly customerApiService = inject(CustomerApiService);

  public resolve(route: ActivatedRouteSnapshot): Observable<CustomerDuplicatesResponse> {
    return this.customerApiService.getCustomerDuplicates();
  }

}
