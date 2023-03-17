import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, Resolve, RouterStateSnapshot} from '@angular/router';
import {CustomerApiService, CustomerData} from '../../../api/customer-api.service';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CustomerDataResolver implements Resolve<CustomerData> {

  constructor(
    private customerApiService: CustomerApiService
  ) {
  }

  public resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<CustomerData> {
    const customerId = +route.params['id'];
    return this.customerApiService.getCustomer(customerId);
  }

}
