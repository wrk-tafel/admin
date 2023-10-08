import {Component} from '@angular/core';
import {Router} from '@angular/router';
import {CustomerAddressData, CustomerApiService, CustomerSearchResult} from '../../../../api/customer-api.service';
import {FormControl, FormGroup} from '@angular/forms';
import {ToastService, ToastType} from '../../../../common/views/default-layout/toasts/toast.service';
import {TafelPaginationData} from "../../../../common/components/tafel-pagination/tafel-pagination.component";

@Component({
  selector: 'tafel-customer-search',
  templateUrl: 'customer-search.component.html'
})
export class CustomerSearchComponent {
  searchResult: CustomerSearchResult;
  customerSearchForm = new FormGroup({
    customerId: new FormControl<number>(null),
    lastname: new FormControl<string>(null),
    firstname: new FormControl<string>(null)
  });
  paginationData: TafelPaginationData;

  constructor(
    private customerApiService: CustomerApiService,
    private router: Router,
    private toastService: ToastService
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
      next: (response) => this.router.navigate(['/kunden/detail', customerId])
    };
    this.customerApiService.getCustomer(customerId).subscribe(observer);
  }

  searchForDetails(page?: number) {
    this.customerApiService.searchCustomer(this.lastname.value, this.firstname.value, page)
      .subscribe((response: CustomerSearchResult) => {
        if (response.items.length === 0) {
          this.toastService.showToast({type: ToastType.INFO, title: 'Keine Kunden gefunden!'});
          this.searchResult = null;
          this.paginationData = null;
        } else {
          this.searchResult = response;
          this.paginationData = {
            count: response.items.length,
            totalCount: response.totalCount,
            currentPage: response.currentPage,
            totalPages: response.totalPages,
            pageSize: response.pageSize
          };
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
