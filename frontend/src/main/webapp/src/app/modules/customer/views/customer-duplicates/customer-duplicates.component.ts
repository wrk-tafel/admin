import {Component, inject, Input, OnInit} from '@angular/core';
import {
  CustomerAddressData,
  CustomerApiService,
  CustomerData,
  CustomerDuplicatesResponse
} from '../../../../api/customer-api.service';
import {Router} from '@angular/router';
import {
  TafelPaginationComponent,
  TafelPaginationData
} from '../../../../common/components/tafel-pagination/tafel-pagination.component';
import * as moment from 'moment/moment';
import {ToastService, ToastType} from '../../../../common/components/toasts/toast.service';
import {
  ButtonDirective,
  CardBodyComponent,
  CardComponent,
  CardHeaderComponent,
  ColComponent,
  RowComponent
} from '@coreui/angular';
import {DatePipe, NgClass, NgForOf, NgIf} from '@angular/common';
import {faCheck, faMagnifyingGlass, faTrashCan} from '@fortawesome/free-solid-svg-icons';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';

@Component({
  selector: 'tafel-customer-duplicates',
  templateUrl: 'customer-duplicates.component.html',
  imports: [
    CardComponent,
    CardHeaderComponent,
    CardBodyComponent,
    RowComponent,
    ColComponent,
    TafelPaginationComponent,
    DatePipe,
    NgClass,
    ButtonDirective,
    NgIf,
    NgForOf,
    FaIconComponent
  ],
  standalone: true
})
export class CustomerDuplicatesComponent implements OnInit {
  @Input() customerDuplicatesData: CustomerDuplicatesResponse;

  paginationData: TafelPaginationData;
  private readonly customerApiService = inject(CustomerApiService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  ngOnInit(): void {
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

  mergeCustomers(customer: CustomerData) {
    const sourceCustomerIds = [this.customerDuplicatesData.items[0].customer, ...this.customerDuplicatesData.items[0].similarCustomers]
      .filter((filterCustomer) => filterCustomer.id !== customer.id)
      .map(mapCustomer => mapCustomer.id);

    const observer = {
      next: () => {
        this.toastService.showToast({
          type: ToastType.SUCCESS,
          title: 'Kunden wurden zusammengeführt!',
          message: `${sourceCustomerIds.length} Kunde(n) wurden gelöscht.`
        });
        this.getDuplicates(1);
      },
      error: error => {
        this.toastService.showToast({type: ToastType.ERROR, title: 'Zusammenführen der Kunden fehlgeschlagen!'});
      }
    };
    this.customerApiService.mergeCustomers(customer.id, sourceCustomerIds).subscribe(observer);
  }

  protected readonly faCheck = faCheck;
  protected readonly faMagnifyingGlass = faMagnifyingGlass;
  protected readonly faTrashCan = faTrashCan;
}
