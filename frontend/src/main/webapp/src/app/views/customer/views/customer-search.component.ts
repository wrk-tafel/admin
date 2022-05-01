import { Component } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { CustomerApiService } from '../api/customer-api.service';

@Component({
  selector: 'customer-search',
  templateUrl: 'customer-search.component.html'
})
export class CustomerSearchComponent {
  constructor(
    private customerApiService: CustomerApiService
  ) { }

  customerSearchForm = new FormGroup({
    customerId: new FormControl(''),
    lastname: new FormControl(''),
    firstname: new FormControl('')
  });

  search() {
    if (this.customerId) {
      // TODO router / navigate, maybe? Check if exists? on detailpage?
    }
    else {
      this.customerApiService.searchCustomer(this.customerSearchForm.value).subscribe((res) => {
        // TODO
        console.log("RESPONSE", res);
      });
    }
  }

  get customerId() { return this.customerSearchForm.get('customerId'); }
  get lastname() { return this.customerSearchForm.get('lastname'); }
  get firstname() { return this.customerSearchForm.get('firstname'); }
}

export interface CustomerSearchFormData {
  customerId?: number;
  lastname?: string;
  firstname?: string;
}
