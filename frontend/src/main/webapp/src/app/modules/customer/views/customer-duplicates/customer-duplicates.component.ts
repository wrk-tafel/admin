import {Component, computed, inject, input, linkedSignal} from '@angular/core';
import {CustomerApiService, CustomerData, CustomerDuplicatesItem, CustomerDuplicatesResponse} from '../../../../api/customer-api.service';
import {Router} from '@angular/router';
import dayjs from 'dayjs';
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import {MatDialog} from '@angular/material/dialog';
import {MatMenuModule} from '@angular/material/menu';
import {MatPaginatorModule} from '@angular/material/paginator';
import {DatePipe, NgClass} from '@angular/common';
import {MatIcon} from '@angular/material/icon';
import {FormatCustomerAddressPipe} from '../../../../common/pipes/format-customer-address.pipe';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {PAGE_SIZE_OPTIONS} from '../../../../common/api/paged-response';
import {DeleteCustomerDialogComponent} from '../customer-detail/dialogs/delete-customer-dialog.component';
import {registerSvgIcons} from '../../../../common/util/svg-icon.util';
import checkIcon from '@material-symbols/svg-400/outlined/check.svg';
import checkCircleIcon from '@material-symbols/svg-400/outlined/check_circle.svg';

type DuplicateComparisonFieldKind = 'date' | 'text';

interface DuplicateComparisonField {
  key: string;
  label: string;
  kind: DuplicateComparisonFieldKind;
  read: (customer: CustomerData) => unknown;
}

@Component({
  selector: 'tafel-customer-duplicates',
  templateUrl: 'customer-duplicates.component.html',
  providers: [DatePipe],
  imports: [
    MatCardModule,
    MatPaginatorModule,
    MatMenuModule,
    DatePipe,
    NgClass,
    MatButtonModule,
    MatIcon
  ]
})
export class CustomerDuplicatesComponent {
  private readonly registerIcons = registerSvgIcons({check: checkIcon, check_circle: checkCircleIcon});

  // Input signal - aliased to match the route resolver data key (see customer.routes.ts) since the
  // unaliased name below is already used for the locally-writable linkedSignal counterpart
  // eslint-disable-next-line @angular-eslint/no-input-rename
  readonly customerDuplicatesDataInput = input<CustomerDuplicatesResponse>(undefined, {alias: 'customerDuplicatesData'});

  // Writable signal linked to input - resets when input changes, locally writable for pagination/updates
  readonly customerDuplicatesData = linkedSignal(() => this.customerDuplicatesDataInput());

  // Total possible-duplicate groups, shown above the list so a reviewer can see how much work is
  // left in the queue - one duplicate group is what a "page" holds (pageSize is hardcoded to 1 by
  // the backend, see startMerge()'s doc comment below).
  protected readonly totalGroupsLabel = computed(() => {
    const total = this.customerDuplicatesData()?.totalCount ?? 0;
    if (total === 0) {
      return '';
    }
    return total === 1 ? '1 mögliches Duplikat' : `${total} mögliche Duplikate`;
  });

  // What the role="status" region in the template says: paging, and merging, deleting or
  // dismissing a candidate, replace the whole list without announcing what is left.
  protected readonly duplicatesAnnouncement = computed(() => {
    const data = this.customerDuplicatesData();
    if (!data) {
      return '';
    }
    return data.totalCount === 0
      ? 'Keine Duplikate gefunden'
      : `${data.totalCount} mögliche Duplikate gefunden, Seite ${data.currentPage}`;
  });

  private readonly customerApiService = inject(CustomerApiService);
  private readonly router = inject(Router);
  private readonly toastr = inject(TafelToastrService);
  private readonly dialog = inject(MatDialog);
  private readonly datePipe = inject(DatePipe);
  private readonly formatAddressPipe = new FormatCustomerAddressPipe();

  // The comparison table's rows - deliberately a short, cheap-to-read set (see issue #3220): name
  // is already the column header, and "last activity" isn't in CustomerData without a backend
  // change, so it's left out. "Gültig bis" isn't in here either - it's rendered as its own row
  // below with its valid/invalid colour coding, same as before this rework.
  protected readonly comparisonFields: DuplicateComparisonField[] = [
    {key: 'birthDate', label: 'Geburtsdatum', kind: 'date', read: customer => customer.birthDate},
    {key: 'address', label: 'Adresse', kind: 'text', read: customer => this.formatAddressPipe.transform(customer.address)},
    {
      key: 'personCount',
      label: 'Personen',
      kind: 'text',
      read: customer => {
        const count = this.personCount(customer);
        return count === 1 ? '1 Person' : `${count} Personen`;
      }
    }
  ];

  getDuplicates(page?: number) {
    this.customerApiService.getCustomerDuplicates(page)
      .subscribe((response: CustomerDuplicatesResponse) => {
        this.customerDuplicatesData.set(response.items.length === 0 ? undefined : response);
      });
  }

  isValid(customer: CustomerData) {
    return !dayjs(customer.validUntil).startOf('day').isBefore(dayjs().startOf('day'));
  }

  candidatesFor(item: CustomerDuplicatesItem): CustomerData[] {
    return [item.customer, ...item.similarCustomers];
  }

  personCount(customer: CustomerData): number {
    return 1 + (customer.additionalPersons ?? []).filter(person => !person.excludeFromHousehold).length;
  }

  formatFieldValue(field: DuplicateComparisonField, customer: CustomerData): string {
    const value = field.read(customer);
    if (value === null || value === undefined || value === '') {
      return '-';
    }
    return field.kind === 'date' ? (this.datePipe.transform(value as Date, 'dd.MM.yyyy') ?? '-') : String(value);
  }

  /**
   * Whether the candidates in `item` disagree on `field` - drives the muted-vs-emphasized styling
   * that makes the delta between candidates visible instead of making the reviewer read every cell.
   */
  fieldDiffers(item: CustomerDuplicatesItem, field: DuplicateComparisonField): boolean {
    const values = this.candidatesFor(item).map(candidate => this.formatFieldValue(field, candidate));
    return new Set(values).size > 1;
  }

  showCustomerDetail(customerId: number) {
    this.router.navigate(['/kunden/detail/' + customerId]);
  }

  openDeleteCustomerDialog(customer: CustomerData) {
    this.dialog.open(DeleteCustomerDialogComponent, {data: {customerName: `${customer.lastname} ${customer.firstname}`}})
      .afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.deleteCustomer(customer.id!);
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
   * Marks `target` and `other` as reviewed-and-not-duplicates so this specific pair stops
   * reappearing on future visits (see HouseholdDuplicationService.dismiss on the backend). Reuses
   * the same "stay on the current page" queue semantics as deleteCustomer() above.
   */
  dismissDuplicate(target: CustomerData, other: CustomerData) {
    const observer = {
      next: () => {
        this.toastr.success('Als "kein Duplikat" markiert!');
        this.getDuplicates(this.customerDuplicatesData()!.currentPage);
      },
      error: () => {
        this.toastr.error('Markieren fehlgeschlagen!');
      }
    };
    this.customerApiService.dismissDuplicate(target.id!, other.id!).subscribe(observer);
  }

  /**
   * Opens the merge picker for `customer` (the one whose "keep this one" button was clicked) against
   * the rest of its duplicate pair. Reads the pair from `items[0]` regardless of which button in the
   * template was clicked - safe only because the backend's duplicates endpoint hardcodes a page size
   * of 1 (`HouseholdDuplicationService.findDuplicates`), so a page's `items` array never holds more
   * than one pair. If that page size ever changes, this needs to look up the specific item `customer`
   * belongs to instead of always taking `items[0]`.
   *
   * `seite` carries the queue position along so the merge screen's "Abbrechen" comes back to this
   * candidate instead of to the first one - with one pair per page, that is the difference between
   * resuming the review and paging through everything already looked at again.
   */
  startMerge(customer: CustomerData) {
    const duplicatesData = this.customerDuplicatesData()!.items[0];
    const sourceCustomerIds = [duplicatesData.customer, ...duplicatesData.similarCustomers]
      .filter((filterCustomer) => filterCustomer.id !== customer.id)
      .map(mapCustomer => mapCustomer.id!);

    this.router.navigate(['/kunden/zusammenfuehren', customer.id], {
      queryParams: {
        quellen: sourceCustomerIds.join(','),
        seite: this.customerDuplicatesData()!.currentPage
      }
    });
  }

  trackByDuplicateItemId(index: number, item: CustomerDuplicatesItem): number {
    return item.customer.id!;
  }

  trackByCandidateId(index: number, customer: CustomerData): number {
    return customer.id!;
  }

  // Not enabled here (hidePageSize stays true) - page size is fixed at 1 pair per page, which
  // mergeCustomers() below relies on. Only kept for structural consistency with the other pages.
  protected readonly pageSizeOptions = PAGE_SIZE_OPTIONS;
}
