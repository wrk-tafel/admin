import {Component, computed, inject, input, linkedSignal, signal} from '@angular/core';
import {Router} from '@angular/router';
import {DatePipe} from '@angular/common';
import {MatCardModule} from '@angular/material/card';
import {MatButtonModule} from '@angular/material/button';
import {MatRadioModule} from '@angular/material/radio';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faCircleExclamation} from '@fortawesome/free-solid-svg-icons';
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

@Component({
  selector: 'tafel-customer-merge',
  templateUrl: 'customer-merge.component.html',
  providers: [DatePipe],
  imports: [MatCardModule, MatButtonModule, MatRadioModule, FaIconComponent, DatePipe]
})
export class CustomerMergeComponent {
  // Input signal - aliased to match the route resolver data key (see customer.routes.ts) since the
  // unaliased name below is already used for the locally-writable linkedSignal counterpart.
  // eslint-disable-next-line @angular-eslint/no-input-rename
  readonly customerMergePreviewDataInput = input<CustomerMergePreview>(undefined, {alias: 'customerMergePreviewData'});
  readonly preview = linkedSignal(() => this.customerMergePreviewDataInput());

  private readonly customerApiService = inject(CustomerApiService);
  private readonly router = inject(Router);
  private readonly toastr = inject(TafelToastrService);
  private readonly datePipe = inject(DatePipe);

  // field -> chosen source customer id; undefined means "keep the target's value"
  private readonly selections = signal<Partial<Record<CustomerMergeField, number>>>({});

  readonly showIdenticalFields = signal(false);

  readonly fieldDefinitions = CUSTOMER_MERGE_FIELDS;
  readonly allFields = ALL_CUSTOMER_MERGE_FIELDS;

  readonly target = computed(() => this.preview()!.target);
  readonly sources = computed(() => this.preview()!.sources);

  readonly conflictingFields = computed(() => this.preview()!.fieldConflicts.map(item => item.field));
  readonly identicalFields = computed(() => {
    const conflicting = new Set(this.conflictingFields());
    return this.allFields.filter(field => !conflicting.has(field));
  });

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

  cancel() {
    this.router.navigate(['/kunden/duplikate']);
  }

  confirm() {
    const targetId = this.target().id!;
    const sourceCustomerIds = this.sources().map(source => source.id!);
    const fieldSelections: CustomerMergeFieldSelection[] = this.conflictingFields().map(field => ({
      field,
      sourceCustomerId: this.selectedSourceIdFor(field)
    }));

    const observer = {
      next: (result: CustomerMergeResult) => {
        const summary = `${result.movedPersonCount} Person(en), ${result.movedNoteCount} Notiz(en) übernommen, `
          + `${result.deletedCustomerIds.length} Kunde(n) zusammengeführt.`;
        this.toastr.success(summary, 'Kunden wurden zusammengeführt!');
        this.router.navigate(['/kunden/detail', targetId]);
      },
      error: () => {
        this.toastr.error('Zusammenführen der Kunden fehlgeschlagen!');
      }
    };
    this.customerApiService.mergeCustomers(targetId, sourceCustomerIds, fieldSelections).subscribe(observer);
  }

  protected readonly faCircleExclamation = faCircleExclamation;
}
