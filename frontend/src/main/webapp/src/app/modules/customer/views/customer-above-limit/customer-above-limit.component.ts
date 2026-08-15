import {Component, computed, inject, input, linkedSignal, signal} from '@angular/core';
import {RouterLink} from '@angular/router';
import dayjs from 'dayjs';
import {HttpResponse} from '@angular/common/http';
import {CustomerAboveLimitItem, CustomerAboveLimitResponse, CustomerApiService} from '../../../../api/customer-api.service';
import {MatCardModule} from '@angular/material/card';
import {MatButtonModule} from '@angular/material/button';
import {MatTableModule} from '@angular/material/table';
import {MatPaginatorModule} from '@angular/material/paginator';
import {MatSortModule, Sort, SortDirection} from '@angular/material/sort';
import {MatTooltipModule} from '@angular/material/tooltip';
import {CommonModule} from '@angular/common';
import {faArrowUpRightFromSquare, faSave, faSearch, faUser} from '@fortawesome/free-solid-svg-icons';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {FormatCustomerAddressPipe} from '../../../../common/pipes/format-customer-address.pipe';
import {PAGE_SIZE_OPTIONS} from '../../../../common/api/paged-response';
import {FileHelperService} from '../../../../common/util/file-helper.service';
import {TafelIfPermissionDirective} from '../../../../common/security/tafel-if-permission.directive';

@Component({
  selector: 'tafel-customer-above-limit',
  templateUrl: 'customer-above-limit.component.html',
  imports: [
    MatCardModule,
    MatButtonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    CommonModule,
    FaIconComponent,
    FormatCustomerAddressPipe,
    MatTooltipModule,
    RouterLink,
    TafelIfPermissionDirective
  ]
})
export class CustomerAboveLimitComponent {
  // Input signal - aliased to match the route resolver data key (see customer.routes.ts) since the
  // unaliased name below is already used for the locally-writable linkedSignal counterpart
  // eslint-disable-next-line @angular-eslint/no-input-rename
  readonly customerAboveLimitDataInput = input<CustomerAboveLimitResponse>(undefined, {alias: 'customerAboveLimitData'});

  // Writable signal linked to input - resets when input changes, locally writable for pagination
  readonly customerAboveLimitData = linkedSignal(() => this.customerAboveLimitDataInput());

  // Mirrors the backend's own default (HouseholdService.getHouseholdsAboveLimit) so the initial,
  // resolver-fed page and this control agree on what's currently sorted by without an extra request.
  protected readonly sortActive = signal('amountExceededLimit');
  protected readonly sortDirectionState = signal<SortDirection>('desc');

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
  private readonly fileHelperService = inject(FileHelperService);

  protected readonly today = new Date();

  getAboveLimit(page?: number, pageSize?: number) {
    this.customerApiService.getCustomersAboveLimit(page, pageSize, this.sortActive(), this.sortDirectionState())
      .subscribe((response: CustomerAboveLimitResponse) => {
        this.customerAboveLimitData.set(response.items.length === 0 ? undefined : response);
      });
  }

  onSortChange(sort: Sort) {
    this.sortActive.set(sort.active);
    this.sortDirectionState.set(sort.direction || 'desc');
    this.getAboveLimit(1, this.customerAboveLimitData()?.pageSize);
  }

  protected generateCsv() {
    this.customerApiService.generateCustomersAboveLimitCsv(this.sortActive(), this.sortDirectionState())
      .subscribe(response => this.processCsvResponse(response));
  }

  private processCsvResponse(response: HttpResponse<Blob>) {
    const contentDisposition = response.headers.get('content-disposition')!;
    const filename = contentDisposition.split(';')[1].split('filename')[1].split('=')[1].trim();
    this.fileHelperService.downloadFile(filename, response.body!);
  }

  protected isValid(item: CustomerAboveLimitItem): boolean {
    return !!item.customer.validUntil && !dayjs(item.customer.validUntil).startOf('day').isBefore(dayjs().startOf('day'));
  }

  // Visual cap only - the percentage itself (shown as text) can legitimately exceed 100%.
  protected barWidth(item: CustomerAboveLimitItem): number {
    return Math.min(item.percentageExceededLimit, 100);
  }

  trackByCustomerId(index: number, item: CustomerAboveLimitItem): number {
    return item.customer.id!;
  }

  // columns for mat-table
  displayedColumns = ['icon', 'id', 'name', 'address', 'validUntil', 'totalSum', 'limit', 'amountExceededLimit', 'actions'];

  protected readonly faUser = faUser;
  protected readonly faSearch = faSearch;
  protected readonly faSave = faSave;
  protected readonly faArrowUpRightFromSquare = faArrowUpRightFromSquare;
  protected readonly pageSizeOptions = PAGE_SIZE_OPTIONS;
}
