import {inject, Injectable} from '@angular/core';
import {ActivatedRouteSnapshot} from '@angular/router';
import {CustomerApiService, CustomerData} from '../../../api/customer-api.service';
import {Observable} from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class CustomerDataResolver {
    private customerApiService = inject(CustomerApiService);

    public resolve(route: ActivatedRouteSnapshot): Observable<CustomerData> {
        const customerId = +route.params['id'];
        return this.customerApiService.getCustomer(customerId);
    }

}
