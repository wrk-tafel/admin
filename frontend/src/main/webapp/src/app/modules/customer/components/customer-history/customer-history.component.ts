import {Component, effect, inject, input, signal} from '@angular/core';
import {MatPaginatorModule} from '@angular/material/paginator';
import {AuditApiService, AuditEntriesResponse} from '../../../../api/audit-api.service';
import {PAGE_SIZE_OPTIONS} from '../../../../common/api/paged-response';
import {AuditEntryListComponent} from '../../../../common/components/audit-entry-list/audit-entry-list.component';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';

/**
 * One household's change history, as shown on the customer detail screen's "Verlauf" tab.
 *
 * Loads on demand rather than through the route resolver: most visits to a customer never open this
 * tab, and the detail screen must not wait for a query nobody asked for.
 */
@Component({
  selector: 'tafel-customer-history',
  templateUrl: 'customer-history.component.html',
  imports: [
    MatPaginatorModule,
    AuditEntryListComponent
  ]
})
export class CustomerHistoryComponent {
  customerId = input.required<number>();

  protected readonly history = signal<AuditEntriesResponse | null>(null);
  protected readonly loaded = signal(false);

  private readonly auditApiService = inject(AuditApiService);
  private readonly toastr = inject(TafelToastrService);

  constructor() {
    effect(() => {
      const customerId = this.customerId();
      if (customerId) {
        this.loadHistory(customerId);
      }
    });
  }

  protected loadHistory(customerId: number, page?: number, pageSize?: number) {
    this.auditApiService.getHistoryForCustomer(customerId, page, pageSize).subscribe({
      next: data => {
        this.history.set(data);
        this.loaded.set(true);
      },
      error: () => this.toastr.error('Fehler beim Laden des Verlaufs', 'Fehler')
    });
  }

  protected onPage(pageIndex: number, pageSize: number) {
    this.loadHistory(this.customerId(), pageIndex + 1, pageSize);
  }

  protected readonly pageSizeOptions = PAGE_SIZE_OPTIONS;
}
