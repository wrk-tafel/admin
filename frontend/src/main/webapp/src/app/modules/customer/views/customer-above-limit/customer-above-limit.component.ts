import {Component, computed, inject, input, linkedSignal} from '@angular/core';
import {Router} from '@angular/router';
import {CustomerAboveLimitItem, CustomerAboveLimitResponse, CustomerApiService} from '../../../../api/customer-api.service';
import {MatCardModule} from '@angular/material/card';
import {MatButtonModule} from '@angular/material/button';
import {MatTableModule} from '@angular/material/table';
import {MatPaginatorModule} from '@angular/material/paginator';
import {MatTooltipModule} from '@angular/material/tooltip';
import {CommonModule} from '@angular/common';
import {faSearch, faUser} from '@fortawesome/free-solid-svg-icons';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {FormatCustomerAddressPipe} from '../../../../common/pipes/format-customer-address.pipe';
import {PAGE_SIZE_OPTIONS} from '../../../../common/api/paged-response';

@Component({
  selector: 'tafel-customer-above-limit',
  templateUrl: 'customer-above-limit.component.html',
  imports: [
    MatCardModule,
    MatButtonModule,
    MatTableModule,
    MatPaginatorModule,
    CommonModule,
    FaIconComponent,
    FormatCustomerAddressPipe,
    MatTooltipModule
  ]
})
export class CustomerAboveLimitComponent {
  // Input signal - aliased to match the route resolver data key (see customer.routes.ts) since the
  // unaliased name below is already used for the locally-writable linkedSignal counterpart
  // eslint-disable-next-line @angular-eslint/no-input-rename
  readonly customerAboveLimitDataInput = input<CustomerAboveLimitResponse>(undefined, {alias: 'customerAboveLimitData'});

  // Writable signal linked to input - resets when input changes, locally writable for pagination
  readonly customerAboveLimitData = linkedSignal(() => this.customerAboveLimitDataInput());

  // What the role="status" region in the template says: paging replaces the whole table without
  // announcing what is on the new page.
  protected readonly aboveLimitAnnouncement = computed(() => {
    const data = this.customerAboveLimitData();
    if (!data) {
      return '';
    }
    return data.totalCount === 0
      ? 'Keine Kunden über dem Limit gefunden'
      : `${data.totalCount} Kunden über dem Limit gefunden, Seite ${data.currentPage}`;
  });

  private readonly customerApiService = inject(CustomerApiService);
  private readonly router = inject(Router);

  getAboveLimit(page?: number, pageSize?: number) {
    this.customerApiService.getCustomersAboveLimit(page, pageSize)
      .subscribe((response: CustomerAboveLimitResponse) => {
        this.customerAboveLimitData.set(response.items.length === 0 ? undefined : response);
      });
  }

  showCustomerDetail(customerId: number) {
    this.router.navigate(['/kunden/detail', customerId]);
  }

  trackByCustomerId(index: number, item: CustomerAboveLimitItem): number {
    return item.customer.id!;
  }

  // columns for mat-table
  displayedColumns = ['icon', 'id', 'name', 'address', 'validUntil', 'totalSum', 'limit', 'amountExceededLimit', 'actions'];

  protected readonly faUser = faUser;
  protected readonly faSearch = faSearch;
  protected readonly pageSizeOptions = PAGE_SIZE_OPTIONS;
}
