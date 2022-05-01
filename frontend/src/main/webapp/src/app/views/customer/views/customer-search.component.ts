import { Component } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';

@Component({
  selector: 'customer-search',
  templateUrl: 'customer-search.component.html'
})
export class CustomerSearchComponent {

  customerSearchForm = new FormGroup({
    customerId: new FormControl(''),
    lastname: new FormControl(''),
    firstname: new FormControl('')
  });

  search() {
    console.log("SEARCH", this.customerSearchForm);
  }
}

export interface CustomerSearchFormData {
  customerId?: number;
  lastname?: string;
  firstname?: string;
}
