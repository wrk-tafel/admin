import {Component, computed, inject, input, linkedSignal, signal} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {DatePipe} from '@angular/common';
import {toSignal} from '@angular/core/rxjs-interop';
import {map} from 'rxjs';
import {BreakpointObserver} from '@angular/cdk/layout';
import {StepperOrientation} from '@angular/cdk/stepper';
import {MatCardModule} from '@angular/material/card';
import {MatButtonModule} from '@angular/material/button';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatRadioModule} from '@angular/material/radio';
import {MatStepperModule} from '@angular/material/stepper';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {IconDefinition} from '@fortawesome/fontawesome-svg-core';
import {faCheck, faCircleExclamation, faTriangleExclamation, faXmark} from '@fortawesome/free-solid-svg-icons';
import {
  CustomerApiService,
  CustomerData,
  CustomerMergeField,
  CustomerMergeFieldSelection,
  CustomerMergePersonEntry,
  CustomerMergePreview,
  CustomerMergeResult
} from '../../../../api/customer-api.service';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {ALL_CUSTOMER_MERGE_FIELDS, CUSTOMER_MERGE_FIELDS} from './customer-merge-fields';

// Below this the conflict grid's columns stack instead of sitting side by side, and the stepper
// turns vertical - the same 768px the rest of the application treats as "desktop layout".
const DESKTOP_BREAKPOINT = '(min-width: 768px)';

/** One customer column of the conflict grid - the target first, then the sources in preview order. */
export interface CustomerMergeColumn {
  customer: CustomerData;
  isTarget: boolean;
  label: string;
}

/**
 * One customer's value for one conflicting field. A cell is only `selectable` when that customer
 * actually disagrees with the target: a source that carries the target's value has nothing to
 * decide, so it stays visible (the column would otherwise have a hole) but inert.
 */
export interface CustomerMergeCell {
  customerId: number;
  isTarget: boolean;
  value: string;
  radioValue: string;
  selectable: boolean;
  selected: boolean;
  testId: string;
}

export interface CustomerMergeConflictRow {
  field: CustomerMergeField;
  label: string;
  icon?: IconDefinition;
  cells: CustomerMergeCell[];
}

/** A resolved field on the confirm step - `changed` marks the ones a source value won. */
export interface CustomerMergeSummaryRow {
  field: CustomerMergeField;
  label: string;
  value: string;
  changed: boolean;
  previousValue: string;
  sourceCustomerId?: number;
}

export interface CustomerMergePersonGroup {
  sourceCustomerId: number;
  label: string;
  entries: { entry: CustomerMergePersonEntry; index: number }[];
}

@Component({
  selector: 'tafel-customer-merge',
  templateUrl: 'customer-merge.component.html',
  styleUrls: ['customer-merge.component.scss'],
  providers: [DatePipe],
  imports: [MatCardModule, MatButtonModule, MatCheckboxModule, MatRadioModule, MatStepperModule, FaIconComponent, DatePipe]
})
export class CustomerMergeComponent {
  // Input signal - aliased to match the route resolver data key (see customer.routes.ts) since the
  // unaliased name below is already used for the locally-writable linkedSignal counterpart.
  // eslint-disable-next-line @angular-eslint/no-input-rename
  readonly customerMergePreviewDataInput = input<CustomerMergePreview>(undefined, {alias: 'customerMergePreviewData'});
  readonly preview = linkedSignal(() => this.customerMergePreviewDataInput());

  private readonly customerApiService = inject(CustomerApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toastr = inject(TafelToastrService);
  private readonly datePipe = inject(DatePipe);
  private readonly breakpointObserver = inject(BreakpointObserver);

  // field -> chosen source customer id; undefined means "keep the target's value"
  private readonly selections = signal<Partial<Record<CustomerMergeField, number>>>({});

  readonly showIdenticalFields = signal(false);

  // The merge is irreversible, so the confirm button stays disabled until this is ticked - and
  // `merging` keeps a double click from firing a second merge against already-deleted sources.
  readonly confirmationAccepted = signal(false);
  readonly merging = signal(false);

  readonly fieldDefinitions = CUSTOMER_MERGE_FIELDS;
  readonly allFields = ALL_CUSTOMER_MERGE_FIELDS;

  readonly isDesktopLayout = toSignal(
    this.breakpointObserver.observe([DESKTOP_BREAKPOINT]).pipe(map(state => state.matches)),
    {initialValue: this.breakpointObserver.isMatched(DESKTOP_BREAKPOINT)}
  );
  readonly stepperOrientation = computed<StepperOrientation>(() => this.isDesktopLayout() ? 'horizontal' : 'vertical');

  readonly target = computed(() => this.preview()!.target);
  readonly sources = computed(() => this.preview()!.sources);

  readonly conflictingFields = computed(() => this.preview()!.fieldConflicts.map(item => item.field));
  readonly identicalFields = computed(() => {
    const conflicting = new Set(this.conflictingFields());
    return this.allFields.filter(field => !conflicting.has(field));
  });

  readonly columns = computed<CustomerMergeColumn[]>(() => [
    {customer: this.target(), isTarget: true, label: this.customerLabel(this.target())},
    ...this.sources().map(source => ({customer: source, isTarget: false, label: this.customerLabel(source)}))
  ]);

  readonly conflictRows = computed<CustomerMergeConflictRow[]>(() => this.conflictingFields().map(field => {
    const conflictingSourceIds = new Set(this.conflictSourceIdsFor(field));
    const selectedSourceId = this.selectedSourceIdFor(field);

    return {
      field,
      label: this.fieldDefinitions[field].label,
      icon: this.fieldDefinitions[field].icon,
      cells: this.columns().map(column => {
        const customerId = column.customer.id!;
        return {
          customerId,
          isTarget: column.isTarget,
          value: this.formatFieldValue(field, column.customer),
          radioValue: column.isTarget ? 'target' : customerId.toString(),
          selectable: column.isTarget || conflictingSourceIds.has(customerId),
          selected: column.isTarget ? selectedSourceId === undefined : selectedSourceId === customerId,
          testId: column.isTarget ? `merge-field-${field}-target` : `merge-field-${field}-source-${customerId}`
        };
      })
    };
  }));

  readonly identicalFieldRows = computed(() => this.identicalFields().map(field => ({
    field,
    label: this.fieldDefinitions[field].label,
    value: this.formatFieldValue(field, this.target())
  })));

  readonly summaryRows = computed<CustomerMergeSummaryRow[]>(() => this.allFields.map(field => {
    const sourceCustomerId = this.selectedSourceIdFor(field);
    return {
      field,
      label: this.fieldDefinitions[field].label,
      value: this.resolvedDisplayValue(field),
      changed: sourceCustomerId !== undefined,
      previousValue: this.formatFieldValue(field, this.target()),
      sourceCustomerId
    };
  }));

  readonly changedSummaryRows = computed(() => this.summaryRows().filter(row => row.changed));

  readonly personGroups = computed<CustomerMergePersonGroup[]>(() => {
    const groups = new Map<number, CustomerMergePersonGroup>();

    this.preview()!.persons.forEach((entry, index) => {
      const group = groups.get(entry.sourceCustomerId) ?? {
        sourceCustomerId: entry.sourceCustomerId,
        label: this.customerLabel(this.customerFor(entry.sourceCustomerId)),
        entries: []
      };
      // The index stays the one from the flat preview list so a person's test hook doesn't shift
      // when a group above it gains or loses an entry.
      group.entries.push({entry, index});
      groups.set(entry.sourceCustomerId, group);
    });

    return [...groups.values()];
  });

  readonly movedPersonCount = computed(() => this.preview()!.persons.filter(item => !item.duplicate).length);
  readonly droppedPersonCount = computed(() => this.preview()!.persons.filter(item => item.duplicate).length);

  /** The duplicates page this merge was started from - carried back on cancel (see {@link cancel}). */
  private readonly duplicatesPage = this.route.snapshot?.queryParams?.['seite'];

  conflictSourceIdsFor(field: CustomerMergeField): number[] {
    return this.preview()!.fieldConflicts.find(item => item.field === field)?.conflictingSourceCustomerIds ?? [];
  }

  selectedSourceIdFor(field: CustomerMergeField): number | undefined {
    return this.selections()[field];
  }

  selectField(field: CustomerMergeField, sourceCustomerId: number | undefined) {
    this.selections.update(current => ({...current, [field]: sourceCustomerId}));
  }

  customerFor(customerId: number): CustomerData {
    return this.target().id === customerId ? this.target() : this.sources().find(source => source.id === customerId)!;
  }

  customerLabel(customer: CustomerData): string {
    return `${customer.id} - ${customer.lastname} ${customer.firstname}`;
  }

  formatFieldValue(field: CustomerMergeField, customer: CustomerData): string {
    const value = this.fieldDefinitions[field].read(customer);
    if (value === null || value === undefined || value === '') {
      return '-';
    }

    switch (this.fieldDefinitions[field].kind) {
      case 'date':
        return this.datePipe.transform(value as Date, 'dd.MM.yyyy') ?? '-';
      case 'currency':
        return `${value} €`;
      case 'boolean':
        return value ? 'Ja' : 'Nein';
      default:
        return String(value);
    }
  }

  resolvedDisplayValue(field: CustomerMergeField): string {
    const selectedSourceId = this.selectedSourceIdFor(field);
    const customer = selectedSourceId !== undefined ? this.customerFor(selectedSourceId) : this.target();
    return this.formatFieldValue(field, customer);
  }

  personLabel(item: CustomerMergePersonEntry): string {
    const birthDate = this.datePipe.transform(item.person.birthDate, 'dd.MM.yyyy') ?? '-';
    return `${item.person.lastname} ${item.person.firstname} (${birthDate})`;
  }

  toggleIdenticalFields() {
    this.showIdenticalFields.update(current => !current);
  }

  /**
   * Back to the duplicates queue - at the page this merge was opened from, since the queue shows
   * one pair per page and landing back on page 1 would mean paging forward to the next candidate
   * by hand every time a merge is abandoned.
   */
  cancel() {
    if (this.duplicatesPage) {
      this.router.navigate(['/kunden/duplikate'], {queryParams: {seite: this.duplicatesPage}});
    } else {
      this.router.navigate(['/kunden/duplikate']);
    }
  }

  confirm() {
    if (!this.confirmationAccepted() || this.merging()) {
      return;
    }

    const targetId = this.target().id!;
    const sourceCustomerIds = this.sources().map(source => source.id!);
    const fieldSelections: CustomerMergeFieldSelection[] = this.conflictingFields().map(field => ({
      field,
      sourceCustomerId: this.selectedSourceIdFor(field)
    }));

    this.merging.set(true);
    const observer = {
      next: (result: CustomerMergeResult) => {
        const summary = `${result.movedPersonCount} Person(en), ${result.movedNoteCount} Notiz(en) übernommen, `
          + `${result.deletedCustomerIds.length} Kunde(n) zusammengeführt.`;
        this.toastr.success(summary, 'Kunden wurden zusammengeführt!');
        this.router.navigate(['/kunden/detail', targetId]);
      },
      error: () => {
        this.merging.set(false);
        this.toastr.error('Zusammenführen der Kunden fehlgeschlagen!');
      }
    };
    this.customerApiService.mergeCustomers(targetId, sourceCustomerIds, fieldSelections).subscribe(observer);
  }

  protected readonly faCheck = faCheck;
  protected readonly faCircleExclamation = faCircleExclamation;
  protected readonly faTriangleExclamation = faTriangleExclamation;
  protected readonly faXmark = faXmark;
}
