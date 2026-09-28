import {Component, computed, inject, linkedSignal, signal} from '@angular/core';
import {DatePipe} from '@angular/common';
import {RouterLink} from '@angular/router';
import {rxResource} from '@angular/core/rxjs-interop';
import {MatCardModule} from '@angular/material/card';
import {MatButtonModule} from '@angular/material/button';
import {MatChipsModule} from '@angular/material/chips';
import {MatIcon} from '@angular/material/icon';
import {MatPaginatorModule, PageEvent} from '@angular/material/paginator';
import {MatTableModule} from '@angular/material/table';
import {MatTooltipModule} from '@angular/material/tooltip';
import {
  CustomerApiService,
  CustomerLockedItem,
  CustomerLockedResponse,
  householdLockReasonLabel
} from '../../../../api/customer-api.service';
import {DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS} from '../../../../common/api/paged-response';
import {registerSvgIcons} from '../../../../common/util/svg-icon.util';
import checkIcon from '@material-symbols/svg-400/outlined/check-fill.svg';
import lockIcon from '@material-symbols/svg-400/outlined/lock-fill.svg';
import searchIcon from '@material-symbols/svg-400/outlined/search-fill.svg';

export type LockedFilter = 'all' | 'openEnded' | 'due';

/**
 * Every locked customer, with the ones that have no end date - and so never lift themselves - and the
 * ones whose lock is due for a review called out. "Bestätigen" restarts a lock's review
 * interval; lifting a lock is done on the customer's own screen. The weekly notification about locks
 * due for a review links here.
 */
@Component({
  selector: 'tafel-customer-locked',
  templateUrl: 'customer-locked.component.html',
  imports: [
    DatePipe,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatChipsModule,
    MatIcon,
    MatPaginatorModule,
    MatTableModule,
    MatTooltipModule
  ]
})
export class CustomerLockedComponent {
  private readonly registerIcons = registerSvgIcons({
    check: checkIcon,
    lock: lockIcon,
    search: searchIcon
  });

  private readonly customerApiService = inject(CustomerApiService);

  protected readonly filter = signal<LockedFilter>('all');
  private readonly page = signal(1);
  private readonly pageSize = signal(DEFAULT_PAGE_SIZE);

  private readonly resource = rxResource({
    params: () => ({filter: this.filter(), page: this.page(), pageSize: this.pageSize()}),
    stream: ({params}) => this.customerApiService.getLockedCustomers(
      params.page, params.pageSize, params.filter === 'openEnded', params.filter === 'due'
    )
  });

  /** The page shown. Kept while the next one loads, so the list does not vanish on every change. */
  protected readonly data = linkedSignal<CustomerLockedResponse | undefined, CustomerLockedResponse | null>({
    source: () => this.resource.hasValue() ? this.resource.value() : undefined,
    computation: (value, previous) => value ?? previous?.value ?? null
  });

  protected readonly failed = computed(() => this.resource.status() === 'error');
  protected readonly initialLoading = computed(() => this.resource.isLoading() && this.data() === null);

  /** What the role="status" region says: filtering and confirming replace the list without a word. */
  protected readonly confirmation = signal('');
  protected readonly announcement = computed(() => {
    const data = this.data();
    if (!data) {
      return '';
    }
    return data.totalCount === 0
      ? 'Keine gesperrten Kunden gefunden'
      : `${data.totalCount} gesperrte Kunden gefunden, Seite ${data.currentPage}`;
  });

  protected readonly filterLabel = computed(() => {
    switch (this.filter()) {
      case 'openEnded':
        return 'ohne Enddatum';
      case 'due':
        return 'mit fälliger Überprüfung';
      default:
        return '';
    }
  });

  protected readonly displayedColumns = ['householdId', 'name', 'reason', 'lockedAt', 'lockedUntil', 'review', 'actions'];
  protected readonly pageSizeOptions = PAGE_SIZE_OPTIONS;

  protected onFilterChange(value: LockedFilter | undefined) {
    // deselecting the active chip falls back to the full list rather than to "no filter chosen"
    this.filter.set(value ?? 'all');
    this.page.set(1);
    this.confirmation.set('');
  }

  protected onPage(event: PageEvent) {
    this.confirmation.set('');
    // A new page size starts over at page 1: the old page number means something else at another size.
    if (event.pageSize !== this.pageSize()) {
      this.pageSize.set(event.pageSize);
      this.page.set(1);
    } else {
      this.page.set(event.pageIndex + 1);
    }
  }

  protected confirmReview(item: CustomerLockedItem) {
    this.customerApiService.confirmLockReview(item.householdId).subscribe(() => {
      this.confirmation.set(`Sperre von Kunde ${item.householdId} als überprüft bestätigt`);
      this.resource.reload();
    });
  }

  protected reasonLabelOf(item: CustomerLockedItem): string | null {
    return item.lockReasonType ? householdLockReasonLabel[item.lockReasonType] : null;
  }

  protected isOpenEnded(item: CustomerLockedItem): boolean {
    return !item.lockedUntil;
  }

  trackByHouseholdId(_index: number, item: CustomerLockedItem): number {
    return item.householdId;
  }
}
