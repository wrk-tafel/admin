import {Component, inject, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import dayjs from 'dayjs';
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatPaginatorModule} from '@angular/material/paginator';
import {MatSelectModule} from '@angular/material/select';
import {
  AuditApiService,
  AuditEntriesResponse,
  auditEntityTypeLabel,
  AuditOperation,
  auditOperationLabel,
  AuditSearchFilter
} from '../../../../api/audit-api.service';
import {PAGE_SIZE_OPTIONS} from '../../../../common/api/paged-response';
import {AuditEntryListComponent} from '../../../../common/components/audit-entry-list/audit-entry-list.component';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';

/**
 * The screen opens on the question it is almost always opened for: what changed on customers
 * recently. Landing on the unfiltered log would mean paging through user and settings entries to
 * get there first.
 *
 * Both defaults are a starting point, not a restriction: the record type has an "Alle" option and
 * the dates can be cleared, which is why "Filter zurücksetzen" returns here rather than to empty.
 */
const DEFAULT_ENTITY_TYPE = 'Household';
const DEFAULT_RANGE_MONTHS = 1;

/** `yyyy-MM-dd` as a native date input expects it, taken from the local calendar rather than UTC. */
const isoDate = (date: dayjs.Dayjs): string => date.format('YYYY-MM-DD');

/**
 * The administration-wide change log: every recorded change across households, users and settings,
 * newest first, narrowable by record type, kind of change, acting user, record number and date.
 *
 * Read-only by construction - the backend exposes no endpoint that would change or remove an entry.
 */
@Component({
  selector: 'tafel-audit-log',
  templateUrl: 'audit-log.component.html',
  imports: [
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatPaginatorModule,
    MatSelectModule,
    AuditEntryListComponent
  ]
})
export class AuditLogComponent {
  protected readonly entries = signal<AuditEntriesResponse | null>(null);
  protected readonly entityTypes = signal<string[]>([]);
  protected readonly operations = signal<AuditOperation[]>([]);

  protected readonly entityType = signal<string | null>(DEFAULT_ENTITY_TYPE);
  protected readonly operation = signal<AuditOperation | null>(null);
  protected readonly actorUsername = signal<string | null>(null);
  protected readonly businessKey = signal<string | null>(null);
  protected readonly from = signal<string | null>(isoDate(dayjs().subtract(DEFAULT_RANGE_MONTHS, 'month')));
  protected readonly to = signal<string | null>(isoDate(dayjs()));

  private readonly auditApiService = inject(AuditApiService);
  private readonly toastr = inject(TafelToastrService);

  constructor() {
    this.auditApiService.getFilterOptions().subscribe({
      next: options => {
        this.entityTypes.set(options.entityTypes);
        this.operations.set(options.operations);
      },
      error: () => this.toastr.error('Fehler beim Laden der Filter', 'Fehler')
    });
    this.search();
  }

  /** Always jumps back to the first page - staying on page 7 of a result set that no longer has one shows nothing. */
  protected search(page?: number, pageSize?: number) {
    const filter: AuditSearchFilter = {
      entityType: this.entityType(),
      operation: this.operation(),
      actorUsername: this.actorUsername(),
      businessKey: this.businessKey(),
      from: this.from(),
      to: this.to()
    };

    this.auditApiService.searchAuditEntries(filter, page, pageSize ?? this.entries()?.pageSize).subscribe({
      next: data => this.entries.set(data),
      error: () => this.toastr.error('Fehler beim Laden des Änderungsprotokolls', 'Fehler')
    });
  }

  /** Back to the state the screen opens in, not to an empty filter - see the note on the defaults above. */
  protected resetFilter() {
    this.entityType.set(DEFAULT_ENTITY_TYPE);
    this.operation.set(null);
    this.actorUsername.set(null);
    this.businessKey.set(null);
    this.from.set(isoDate(dayjs().subtract(DEFAULT_RANGE_MONTHS, 'month')));
    this.to.set(isoDate(dayjs()));
    this.search();
  }

  protected entityTypeLabel(entityType: string): string {
    return auditEntityTypeLabel[entityType] ?? entityType;
  }

  protected operationLabel(operation: AuditOperation): string {
    return auditOperationLabel[operation] ?? operation;
  }

  protected readonly pageSizeOptions = PAGE_SIZE_OPTIONS;
}
