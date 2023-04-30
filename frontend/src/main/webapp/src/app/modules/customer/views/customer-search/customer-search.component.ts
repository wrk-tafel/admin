import {Component} from '@angular/core';
import {Router} from '@angular/router';
import {CustomerAddressData, CustomerApiService, CustomerSearchResult} from '../../../../api/customer-api.service';
import {FormControl, FormGroup} from '@angular/forms';

@Component({
  selector: 'tafel-customer-search',
  templateUrl: 'customer-search.component.html'
})
export class CustomerSearchComponent {
  errorMessage: string;
  searchResult: CustomerSearchResult;
  customerSearchForm = new FormGroup({
    customerId: new FormControl<number>(null),
    lastname: new FormControl<string>(null),
    firstname: new FormControl<string>(null)
  });

  constructor(
    private customerApiService: CustomerApiService,
    private router: Router
  ) {
  }

  get customerId() {
    return this.customerSearchForm.get('customerId');
  }

  get lastname() {
    return this.customerSearchForm.get('lastname');
  }

  get firstname() {
    return this.customerSearchForm.get('firstname');
  }

  searchForCustomerId() {
    const customerId = this.customerId.value;

    /* eslint-disable @typescript-eslint/no-unused-vars */
    const observer = {
      next: (response) => this.router.navigate(['/kunden/detail', customerId]),
      error: error => {
        if (error.status === 404) {
          this.errorMessage = 'Kundennummer ' + customerId + ' nicht gefunden!';
        }
      },
    };
    this.customerApiService.getCustomer(customerId).subscribe(observer);
  }

  searchForDetails() {
    this.customerApiService.searchCustomer(this.lastname.value, this.firstname.value)
      .subscribe((response: CustomerSearchResult) => {
        if (response.items.length === 0) {
          this.errorMessage = 'Keine Kunden gefunden!';
          this.searchResult = null;
        } else {
          this.searchResult = response;
        }
      });
  }

  navigateToCustomer(customerId: number) {
    this.router.navigate(['/kunden/detail', customerId]);
  }

  editCustomer(customerId: number) {
    this.router.navigate(['/kunden/bearbeiten', customerId]);
  }

  formatAddress(address: CustomerAddressData): string {
    let result = '';
    result += address.street + ' ' + address.houseNumber;
    if (address.stairway) {
      result += ', Stiege ' + address.stairway;
    }
    if (address.stairway) {
      result += ', Top ' + address.door;
    }
    result += ' / ' + address.postalCode + ' ' + address.city;
    return result;
  }

}
