import { Component } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { DateHelperService } from '../../../common/util/date-helper.service';
import { CustomerAddressData, CustomerApiService, CustomerData, CustomerSearchResult } from '../api/customer-api.service';

@Component({
  selector: 'customer-search',
  templateUrl: 'customer-search.component.html'
})
export class CustomerSearchComponent {
  constructor(
    private customerApiService: CustomerApiService,
    private router: Router,
    private dateHelper: DateHelperService
  ) { }

  errorMessage: string;
  searchResult: CustomerSearchResult;

  formatDate = this.dateHelper.formatDate

  customerSearchForm = new FormGroup({
    customerId: new FormControl(''),
    lastname: new FormControl(''),
    firstname: new FormControl('')
  });

  searchForCustomerId() {
    const customerId = this.customerId.value;
    this.customerApiService.getCustomer(customerId)
      .subscribe(() => {
        this.router.navigate(['/kunden/detail', customerId]);
      }, error => {
        if (error.status === 404) {
          this.errorMessage = 'Kundennummer ' + customerId + ' nicht gefunden!';
        }
      });
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

  get customerId() { return this.customerSearchForm.get('customerId'); }
  get lastname() { return this.customerSearchForm.get('lastname'); }
  get firstname() { return this.customerSearchForm.get('firstname'); }
}
