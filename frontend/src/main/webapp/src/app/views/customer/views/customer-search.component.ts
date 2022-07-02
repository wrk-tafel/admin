import { Component } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import * as moment from 'moment';
import { CustomerAddressData, CustomerApiService, CustomerData, CustomerSearchResponse } from '../api/customer-api.service';

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
  searchResult: CustomerSearchResult;

  customerSearchForm = new FormGroup({
    customerId: new FormControl(''),
    lastname: new FormControl(''),
    firstname: new FormControl('')
  });

  search() {
    this.customerApiService.searchCustomer(this.lastname.value, this.firstname.value)
      .subscribe((response: CustomerSearchResponse) => {
        if (response.items.length === 0) {
          this.errorMessage = 'Keine Kunden gefunden!';
        } else {
          this.searchResult = { items: response.items.map(item => this.mapItem(item)) };
        }
      });
  }

  showCustomerDetail() {
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

  navigateToCustomer(customerId: number) {
    this.router.navigate(['/kunden/detail', customerId]);
  }

  private mapItem(item: CustomerData): CustomerItem {
    return {
      id: item.id,
      lastname: item.lastname,
      firstname: item.firstname,
      birthDate: moment(item.birthDate).format('DD.MM.YYYY'),
      address: this.formatAddress(item.address)
    };
  }

  private formatAddress(address: CustomerAddressData): string {
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

interface CustomerSearchResult {
  items: CustomerItem[];
}

interface CustomerItem {
  id: number;
  lastname: string;
  firstname: string;
  birthDate: string;
  address: string;
}
