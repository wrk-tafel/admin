import {Component, inject, OnInit} from '@angular/core';
import {
  CustomerAddressData,
  CustomerApiService,
  CustomerData,
  CustomerDuplicatesResponse
} from '../../../../api/customer-api.service';
import {ActivatedRoute, Router} from '@angular/router';
import {TafelPaginationData} from '../../../../common/components/tafel-pagination/tafel-pagination.component';
import * as moment from 'moment/moment';
import {ToastService, ToastType} from '../../../../common/views/default-layout/toasts/toast.service';

@Component({
  selector: 'tafel-customer-duplicates',
  templateUrl: 'customer-duplicates.component.html'
})
export class CustomerDuplicatesComponent implements OnInit {
  private customerApiService = inject(CustomerApiService);
  private activatedRoute = inject(ActivatedRoute);
  private router = inject(Router);
  private toastService = inject(ToastService);

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
      [address.street, address.houseNumber].join(' ').trim(),
      address.stairway ? 'Stiege ' + address.stairway : undefined,
      address.door ? 'Top ' + address.door : undefined,
      [address.postalCode, address.city].join(' ').trim()
    ]
      .filter(value => value?.trim().length > 0)
      .join(', ');
    return formatted?.trim().length > 0 ? formatted : '-';
  }

  isValid(customer: CustomerData) {
    return !moment(customer.validUntil).startOf('day').isBefore(moment().startOf('day'));
  }

  showCustomerDetail(customerId: number) {
    this.router.navigate(['/kunden/detail/' + customerId]);
  }

  deleteCustomer(customerId: number) {
    const observer = {
      next: () => {
        this.toastService.showToast({type: ToastType.SUCCESS, title: 'Kunde wurde gelöscht!'});
        this.getDuplicates(this.paginationData.currentPage);
      },
      error: error => {
        this.toastService.showToast({type: ToastType.ERROR, title: 'Löschen fehlgeschlagen!'});
      }
    };
    this.customerApiService.deleteCustomer(customerId).subscribe(observer);
  }

}
