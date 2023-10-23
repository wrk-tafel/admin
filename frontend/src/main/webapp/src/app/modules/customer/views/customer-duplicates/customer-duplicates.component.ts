import {Component, inject, OnInit} from '@angular/core';
import {
  CustomerAddressData,
  CustomerApiService,
  CustomerDuplicatesResponse
} from '../../../../api/customer-api.service';
import {ActivatedRoute} from '@angular/router';
import {TafelPaginationData} from '../../../../common/components/tafel-pagination/tafel-pagination.component';

@Component({
  selector: 'tafel-customer-duplicates',
  templateUrl: 'customer-duplicates.component.html'
})
export class CustomerDuplicatesComponent implements OnInit {
  private customerApiService = inject(CustomerApiService);
  private activatedRoute = inject(ActivatedRoute);

  customerDuplicatesData: CustomerDuplicatesResponse;
  paginationData: TafelPaginationData;

  ngOnInit(): void {
    this.customerDuplicatesData = this.activatedRoute.snapshot.data.customerDuplicatesData;
    this.paginationData = {
      count: this.customerDuplicatesData.items.length,
      totalCount: this.customerDuplicatesData.totalCount,
      currentPage: this.customerDuplicatesData.currentPage,
      totalPages: this.customerDuplicatesData.totalPages,
      pageSize: this.customerDuplicatesData.pageSize
    };
  }

  getDuplicates(page?: number) {
    this.customerApiService.getCustomerDuplicates(page)
      .subscribe((response: CustomerDuplicatesResponse) => {
        if (response.items.length === 0) {
          this.customerDuplicatesData = null;
          this.paginationData = null;
        } else {
          this.customerDuplicatesData = response;
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

  formatAddress(address: CustomerAddressData) {
    const formatted = [
      [address.street, address.houseNumber].join(' '),
      address.stairway ? 'Stiege ' + address.stairway : undefined,
      address.door ? 'Top ' + address.door : undefined,
      [address.postalCode, address.city].join(' ')
    ]
      .filter(value => value?.trim().length > 0)
      .join(', ');
    return formatted?.trim().length > 0 ? formatted : '-';
  }

}
