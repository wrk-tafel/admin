import {Component, computed, inject, input, linkedSignal, signal} from '@angular/core';
import {Router} from '@angular/router';
import {HttpResponse} from '@angular/common/http';
import dayjs from 'dayjs';
import {CustomerApiService, CustomerData, CustomerOverviewItem, CustomerOverviewResponse} from '../../../../api/customer-api.service';
import {DistributionItem, DistributionListResponse} from '../../../../api/distribution-api.service';
import {MatCardModule} from '@angular/material/card';
import {MatButtonModule} from '@angular/material/button';
import {MatTableModule} from '@angular/material/table';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatSelectModule} from '@angular/material/select';
import {MatButtonToggleChange, MatButtonToggleModule} from '@angular/material/button-toggle';
import {MatTooltipModule} from '@angular/material/tooltip';
import {FormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {MatIcon} from '@angular/material/icon';
import {registerSvgIcons} from '../../../../common/util/svg-icon.util';
import chevronLeftIcon from '@material-symbols/svg-400/outlined/chevron_left.svg';
import chevronRightIcon from '@material-symbols/svg-400/outlined/chevron_right.svg';
import csvIcon from '@material-symbols/svg-400/outlined/csv.svg';
import refreshIcon from '@material-symbols/svg-400/outlined/refresh.svg';
import searchIcon from '@material-symbols/svg-400/outlined/search.svg';
import personAddIcon from '@material-symbols/svg-400/outlined/person_add.svg';
import {FormatCustomerAddressPipe} from '../../../../common/pipes/format-customer-address.pipe';
import {FileHelperService} from '../../../../common/util/file-helper.service';

/** Which rows of the merged list the segmented filter lets through. */
export type OverviewFilter = 'ALL' | 'NEW' | 'RENEWED';

/**
 * One row of the merged list - a {@link CustomerOverviewItem} tagged with which of the backend's
 * two lists it came from, so the type chip and the segmented filter can both work off a single
 * array instead of keeping "Neu" and "Verlängert" as separate render paths.
 */
export interface OverviewRow {
  type: 'NEW' | 'RENEWED';
  item: CustomerOverviewItem;
}

@Component({
  selector: 'tafel-customer-overview',
  templateUrl: 'customer-overview.component.html',
  imports: [
    MatCardModule,
    MatButtonModule,
    MatTableModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonToggleModule,
    FormsModule,
    CommonModule,
    MatIcon,
    FormatCustomerAddressPipe,
    MatTooltipModule
  ]
})
export class CustomerOverviewComponent {
  private readonly registerIcons = registerSvgIcons({
    chevron_left: chevronLeftIcon,
    chevron_right: chevronRightIcon,
    csv: csvIcon,
    refresh: refreshIcon,
    search: searchIcon,
    person_add: personAddIcon
  });

  // Input signals - aliased to match the route resolver data keys (see customer.routes.ts) since the
  // unaliased names below are already used for the locally-writable linkedSignal counterparts
  // eslint-disable-next-line @angular-eslint/no-input-rename
  readonly customerOverviewDataInput = input<CustomerOverviewResponse>(undefined, {alias: 'customerOverviewData'});
  // eslint-disable-next-line @angular-eslint/no-input-rename
  readonly distributionsDataInput = input<DistributionListResponse>(undefined, {alias: 'distributionsData'});

  // Writable signal linked to input - resets when input changes, locally writable when a different
  // distribution is selected
  readonly customerOverviewData = linkedSignal(() => this.customerOverviewDataInput());
  readonly selectedDistributionId = linkedSignal(() => this.customerOverviewDataInput()?.distributionId ?? undefined);

  readonly selectedFilter = signal<OverviewFilter>('ALL');

  readonly newCount = computed(() => this.customerOverviewData()?.newCustomers?.length ?? 0);
  readonly renewedCount = computed(() => this.customerOverviewData()?.renewedCustomers?.length ?? 0);

  // Both lists merged into one, newest-first - the type chip and the segmented filter both read
  // off this instead of two separately rendered tables.
  private readonly allRows = computed<OverviewRow[]>(() => {
    const data = this.customerOverviewData();
    const newRows: OverviewRow[] = (data?.newCustomers ?? []).map(item => ({type: 'NEW' as const, item}));
    const renewedRows: OverviewRow[] = (data?.renewedCustomers ?? []).map(item => ({type: 'RENEWED' as const, item}));
    return [...newRows, ...renewedRows].sort((a, b) => new Date(b.item.date).getTime() - new Date(a.item.date).getTime());
  });

  readonly filteredRows = computed<OverviewRow[]>(() => {
    const filter = this.selectedFilter();
    const rows = this.allRows();
    return filter === 'ALL' ? rows : rows.filter(row => row.type === filter);
  });

  // What the role="status" region in the template says. Picking a different distribution swaps
  // the whole list at once, with nothing else on the screen saying what came back.
  protected readonly overviewAnnouncement = computed(() => {
    const data = this.customerOverviewData();
    if (!data) {
      return '';
    }
    return `${this.newCount()} neue Kunden, ${this.renewedCount()} verlängerte Kunden`;
  });

  // Position of the selected distribution within the (closed-only, newest-first) distributions
  // list backing the select. The backend's default answer is the newest closed distribution -
  // the same first entry of this list - so the resolver-provided selection always matches an
  // option; -1 only when no distribution has been closed yet and the list is empty.
  private readonly currentDistributionIndex = computed(() => {
    const items = this.distributionsDataInput()?.items ?? [];
    const selectedId = this.selectedDistributionId();
    return items.findIndex(distribution => distribution.id === selectedId);
  });

  readonly canGoToNewerDistribution = computed(() => this.currentDistributionIndex() > 0);
  readonly canGoToOlderDistribution = computed(() => {
    const items = this.distributionsDataInput()?.items ?? [];
    const index = this.currentDistributionIndex();
    return index !== -1 && index + 1 < items.length;
  });

  private readonly customerApiService = inject(CustomerApiService);
  private readonly fileHelperService = inject(FileHelperService);
  private readonly router = inject(Router);

  onDistributionSelected(distributionId: number) {
    this.selectedDistributionId.set(distributionId);
    this.customerApiService.getCustomersOverview(distributionId)
      .subscribe((response: CustomerOverviewResponse) => this.customerOverviewData.set(response));
  }

  onFilterChanged(event: MatButtonToggleChange) {
    this.selectedFilter.set(event.value as OverviewFilter);
  }

  goToNewerDistribution() {
    const items = this.distributionsDataInput()?.items ?? [];
    const index = this.currentDistributionIndex();
    if (index > 0) {
      this.onDistributionSelected(items[index - 1].id);
    }
  }

  goToOlderDistribution() {
    const items = this.distributionsDataInput()?.items ?? [];
    const index = this.currentDistributionIndex();
    if (index !== -1 && index + 1 < items.length) {
      this.onDistributionSelected(items[index + 1].id);
    }
  }

  exportCsv() {
    this.customerApiService.generateCustomersOverviewCsv(this.selectedDistributionId())
      .subscribe((response: HttpResponse<Blob>) => this.processCsvResponse(response));
  }

  private processCsvResponse(response: HttpResponse<Blob>) {
    const contentDisposition = response.headers.get('content-disposition')!;
    const filename = contentDisposition.split(';')[1].split('filename')[1].split('=')[1].trim();
    this.fileHelperService.downloadFile(filename, response.body!);
  }

  showCustomerDetail(customerId: number) {
    this.router.navigate(['/kunden/detail', customerId]);
  }

  personsCount(customer: CustomerData): number {
    return 1 + (customer.additionalPersons ?? []).filter(person => !person.excludeFromHousehold).length;
  }

  isCustomerValid(customer: CustomerData): boolean {
    return !customer.locked && !!customer.validUntil && !dayjs(customer.validUntil).startOf('day').isBefore(dayjs().startOf('day'));
  }

  validityLabel(customer: CustomerData): string {
    if (customer.locked) {
      return 'Gesperrt';
    }
    return this.isCustomerValid(customer) ? 'Gültig' : 'Ungültig';
  }

  trackByRow(index: number, row: OverviewRow): number | undefined {
    return row.item.customer.id;
  }

  trackByDistributionId(index: number, item: DistributionItem): number {
    return item.id;
  }

  displayedColumns = ['type', 'id', 'name', 'address', 'persons', 'validity', 'date', 'actions'];

}
