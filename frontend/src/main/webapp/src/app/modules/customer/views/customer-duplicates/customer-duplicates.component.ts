import {Component, effect, inject, input, signal} from '@angular/core';
import {
  CustomerApiService,
  CustomerData,
  CustomerDuplicatesResponse
} from '../../../../api/customer-api.service';
import {Router} from '@angular/router';
import {
  TafelPaginationComponent,
  TafelPaginationData
} from '../../../../common/components/tafel-pagination/tafel-pagination.component';
import moment from 'moment';
import {ToastService, ToastType} from '../../../../common/components/toasts/toast.service';
import {
  ButtonDirective,
  CardBodyComponent,
  CardComponent,
  CardHeaderComponent,
  ColComponent,
  RowComponent
} from '@coreui/angular';
import {DatePipe, NgClass} from '@angular/common';
import {faCheck, faMagnifyingGlass, faTrashCan} from '@fortawesome/free-solid-svg-icons';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {FormatAddressPipe} from '../../../../common/pipes/format-address.pipe';

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
        FaIconComponent,
        FormatAddressPipe
    ]
})
export class CustomerDuplicatesComponent {
  // Signal input from resolver - read-only input
  readonly customerDuplicatesDataInput = input<CustomerDuplicatesResponse>();

  // Writable signal for local updates and template binding
  readonly customerDuplicatesData = signal<CustomerDuplicatesResponse>(null);
  readonly paginationData = signal<TafelPaginationData>(null);

  private readonly customerApiService = inject(CustomerApiService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  constructor() {
    effect(() => {
      const data = this.customerDuplicatesDataInput();
      if (data) {
        this.customerDuplicatesData.set(data);
        this.paginationData.set({
          count: data.items.length,
          totalCount: data.totalCount,
          currentPage: data.currentPage,
          totalPages: data.totalPages,
          pageSize: data.pageSize
        });
      }
    });
  }

  getDuplicates(page?: number) {
    this.customerApiService.getCustomerDuplicates(page)
      .subscribe((response: CustomerDuplicatesResponse) => {
        if (response.items.length === 0) {
          this.customerDuplicatesData.set(null);
          this.paginationData.set(null);
        } else {
          this.customerDuplicatesData.set(response);
          this.paginationData.set({
            count: response.items.length,
            totalCount: response.totalCount,
            currentPage: response.currentPage,
            totalPages: response.totalPages,
            pageSize: response.pageSize
          });
        }
      });
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
        this.getDuplicates(this.paginationData().currentPage);
      },
      error: error => {
        this.toastService.showToast({type: ToastType.ERROR, title: 'Löschen fehlgeschlagen!'});
      }
    };
    this.customerApiService.deleteCustomer(customerId).subscribe(observer);
  }

  mergeCustomers(customer: CustomerData) {
    const sourceCustomerIds = [this.customerDuplicatesData().items[0].customer, ...this.customerDuplicatesData().items[0].similarCustomers]
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

  trackByDuplicateItemId(index: number, item: any): number {
    return item.customer.id;
  }

  trackBySimilarCustomerId(index: number, customer: any): number {
    return customer.id;
  }

  protected readonly faCheck = faCheck;
  protected readonly faMagnifyingGlass = faMagnifyingGlass;
  protected readonly faTrashCan = faTrashCan;
}
