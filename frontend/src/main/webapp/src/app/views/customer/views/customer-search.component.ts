import { Component } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';

@Component({
  selector: 'customer-search',
  templateUrl: 'customer-search.component.html'
})
export class CustomerSearchComponent {

  customerSearchForm = new FormGroup({
    customerId: new FormControl('12313'),
    lastname: new FormControl('T'),
    firstname: new FormControl('C'),
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
