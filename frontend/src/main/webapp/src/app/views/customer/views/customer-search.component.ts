import { Component } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { cibTreehouse } from '@coreui/icons';
import { of } from 'rxjs';
import { CustomerApiService } from '../api/customer-api.service';

@Component({
  selector: 'customer-search',
  templateUrl: 'customer-search.component.html'
})
export class CustomerSearchComponent {
  constructor(
    private customerApiService: CustomerApiService,
    private router: Router
  ) { }

  errorMessage: string;

  customerSearchForm = new FormGroup({
    customerId: new FormControl(''),
    lastname: new FormControl(''),
    firstname: new FormControl('')
  });

  search() {
    if (this.customerId.value) {
      const customerId = this.customerId.value;
      this.customerApiService.getCustomer(customerId)
        .subscribe(() => {
          this.router.navigate(['/kunden/detail', customerId]);
        }, error => {
          if (error.status == 404) {
            this.errorMessage = "Kundennummer " + customerId + " nicht gefunden!";
          }
          return of(true);
        });
    } else {
      this.customerApiService.searchCustomer(this.firstname.value, this.lastname.value)
        .subscribe((res) => {
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
