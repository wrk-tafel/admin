import {Component, inject} from '@angular/core';
import {CustomerApiService} from '../../../../api/customer-api.service';

@Component({
  selector: 'tafel-customer-duplicates',
  templateUrl: 'customer-duplicates.component.html'
})
export class CustomerDuplicatesComponent {
  private customerApiService = inject(CustomerApiService);
}
