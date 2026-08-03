import {Component, inject, input, linkedSignal} from '@angular/core';
import {CustomerApiService, CustomerData, CustomerDuplicatesResponse} from '../../../../api/customer-api.service';
import {Router} from '@angular/router';
import dayjs from 'dayjs';
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import {MatDialog} from '@angular/material/dialog';
import {MatPaginatorModule} from '@angular/material/paginator';
import {DatePipe, NgClass} from '@angular/common';
import {faCheck, faMagnifyingGlass, faTrashCan} from '@fortawesome/free-solid-svg-icons';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {FormatCustomerAddressPipe} from '../../../../common/pipes/format-customer-address.pipe';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {PAGE_SIZE_OPTIONS} from '../../../../common/api/paged-response';
import {DeleteCustomerDialogComponent} from '../customer-detail/dialogs/delete-customer-dialog.component';

@Component({
  selector: 'tafel-customer-duplicates',
  templateUrl: 'customer-duplicates.component.html',
  imports: [
    MatCardModule,
    MatPaginatorModule,
    DatePipe,
    NgClass,
    MatButtonModule,
    FaIconComponent,
    FormatCustomerAddressPipe
  ]
})
export class CustomerDuplicatesComponent {
  // Input signal - aliased to match the route resolver data key (see customer.routes.ts) since the
  // unaliased name below is already used for the locally-writable linkedSignal counterpart
  // eslint-disable-next-line @angular-eslint/no-input-rename
  readonly customerDuplicatesDataInput = input<CustomerDuplicatesResponse>(undefined, {alias: 'customerDuplicatesData'});

  // Writable signal linked to input - resets when input changes, locally writable for pagination/updates
  readonly customerDuplicatesData = linkedSignal(() => this.customerDuplicatesDataInput());

  private readonly customerApiService = inject(CustomerApiService);
  private readonly router = inject(Router);
  private readonly toastr = inject(TafelToastrService);
  private readonly dialog = inject(MatDialog);

  getDuplicates(page?: number) {
    this.customerApiService.getCustomerDuplicates(page)
      .subscribe((response: CustomerDuplicatesResponse) => {
        this.customerDuplicatesData.set(response.items.length === 0 ? undefined : response);
      });
  }

  isValid(customer: CustomerData) {
    return !dayjs(customer.validUntil).startOf('day').isBefore(dayjs().startOf('day'));
  }

  showCustomerDetail(customerId: number) {
    this.router.navigate(['/kunden/detail/' + customerId]);
  }

  openDeleteCustomerDialog(customerId: number) {
    this.dialog.open(DeleteCustomerDialogComponent)
      .afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.deleteCustomer(customerId);
      }
    });
  }

  deleteCustomer(customerId: number) {
    const observer = {
      next: () => {
        this.toastr.success('Kunde wurde gelöscht!');
        this.getDuplicates(this.customerDuplicatesData()!.currentPage);
      },
      error: () => {
        this.toastr.error('Löschen fehlgeschlagen!');
      }
    };
    this.customerApiService.deleteCustomer(customerId).subscribe(observer);
  }

  /**
   * Opens the merge picker for `customer` (the one whose "keep this one" button was clicked) against
   * the rest of its duplicate pair. Reads the pair from `items[0]` regardless of which button in the
   * template was clicked - safe only because the backend's duplicates endpoint hardcodes a page size
   * of 1 (`HouseholdDuplicationService.findDuplicates`), so a page's `items` array never holds more
   * than one pair. If that page size ever changes, this needs to look up the specific item `customer`
   * belongs to instead of always taking `items[0]`.
   */
  startMerge(customer: CustomerData) {
    const duplicatesData = this.customerDuplicatesData()!.items[0];
    const sourceCustomerIds = [duplicatesData.customer, ...duplicatesData.similarCustomers]
      .filter((filterCustomer) => filterCustomer.id !== customer.id)
      .map(mapCustomer => mapCustomer.id!);

    this.router.navigate(['/kunden/zusammenfuehren', customer.id], {queryParams: {quellen: sourceCustomerIds.join(',')}});
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
  // Not enabled here (hidePageSize stays true) - page size is fixed at 1 pair per page, which
  // mergeCustomers() below relies on. Only kept for structural consistency with the other pages.
  protected readonly pageSizeOptions = PAGE_SIZE_OPTIONS;
}
