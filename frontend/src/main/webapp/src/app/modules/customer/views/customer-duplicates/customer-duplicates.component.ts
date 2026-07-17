import {Component, inject, input, linkedSignal} from '@angular/core';
import {CustomerApiService, CustomerData, CustomerDuplicatesResponse} from '../../../../api/customer-api.service';
import {Router} from '@angular/router';
import {
  TafelPaginationComponent,
  TafelPaginationData
} from '../../../../common/components/tafel-pagination/tafel-pagination.component';
import moment from 'moment';
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import {DatePipe, NgClass} from '@angular/common';
import {faCheck, faMagnifyingGlass, faTrashCan} from '@fortawesome/free-solid-svg-icons';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {FormatCustomerAddressPipe} from '../../../../common/pipes/format-customer-address.pipe';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';

@Component({
  selector: 'tafel-customer-duplicates',
  templateUrl: 'customer-duplicates.component.html',
  imports: [
    MatCardModule,
    TafelPaginationComponent,
    DatePipe,
    NgClass,
    MatButtonModule,
    FaIconComponent,
    FormatCustomerAddressPipe
  ]
})
export class CustomerDuplicatesComponent {
  // Signal input from resolver - read-only input
  readonly customerDuplicatesDataInput = input<CustomerDuplicatesResponse>();

  // Writable signal linked to input - resets when input changes, locally writable for pagination/updates
  readonly customerDuplicatesData = linkedSignal(() => this.customerDuplicatesDataInput());

  // Pagination data derived from customerDuplicatesData via linkedSignal
  readonly paginationData = linkedSignal<TafelPaginationData | null>(() => {
    const data = this.customerDuplicatesData();
    if (data) {
      return {
        count: data.items.length,
        totalCount: data.totalCount,
        currentPage: data.currentPage,
        totalPages: data.totalPages,
        pageSize: data.pageSize
      };
    }
    return null;
  });

  private readonly customerApiService = inject(CustomerApiService);
  private readonly router = inject(Router);
  private readonly toastr = inject(TafelToastrService);

  getDuplicates(page?: number) {
    this.customerApiService.getCustomerDuplicates(page)
      .subscribe((response: CustomerDuplicatesResponse) => {
        // Setting customerDuplicatesData automatically recomputes paginationData via linkedSignal
        this.customerDuplicatesData.set(response.items.length === 0 ? undefined : response);
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
        this.toastr.success('Kunde wurde gelöscht!');
        this.getDuplicates(this.paginationData()!.currentPage);
      },
      error: () => {
        this.toastr.error('Löschen fehlgeschlagen!');
      }
    };
    this.customerApiService.deleteCustomer(customerId).subscribe(observer);
  }

  mergeCustomers(customer: CustomerData) {
    const duplicatesData = this.customerDuplicatesData()!.items[0];
    const sourceCustomerIds = [duplicatesData.customer, ...duplicatesData.similarCustomers]
      .filter((filterCustomer) => filterCustomer.id !== customer.id)
      .map(mapCustomer => mapCustomer.id!);

    const observer = {
      next: () => {
        this.toastr.success(`${sourceCustomerIds.length} Kunde(n) wurden gelöscht.`, 'Kunden wurden zusammengeführt!');
        this.getDuplicates(1);
      },
      error: () => {
        this.toastr.error('Zusammenführen der Kunden fehlgeschlagen!');
      }
    };
    this.customerApiService.mergeCustomers(customer.id!, sourceCustomerIds).subscribe(observer);
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
