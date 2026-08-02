import {Component, inject, signal} from '@angular/core';
import {Router} from '@angular/router';
import {CustomerApiService, CustomerData, CustomerSearchResult} from '../../../../api/customer-api.service';
import {FormBuilder, ReactiveFormsModule} from '@angular/forms';
import {MatCardModule} from '@angular/material/card';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatButtonModule} from '@angular/material/button';
import {MatTableModule} from '@angular/material/table';
import {MatDividerModule} from '@angular/material/divider';
import {MatPaginatorModule} from '@angular/material/paginator';
import {CommonModule} from '@angular/common';
import {faPencil, faSearch, faUser} from '@fortawesome/free-solid-svg-icons';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {TafelAutofocusDirective} from '../../../../common/directive/tafel-autofocus.directive';
import {FormatCustomerAddressPipe} from '../../../../common/pipes/format-customer-address.pipe';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {SUPPRESS_ERROR_TOAST_CONTEXT} from '../../../../common/http/suppress-error-toast.token';
import {PAGE_SIZE_OPTIONS} from '../../../../common/api/paged-response';

@Component({
  selector: 'tafel-customer-search',
  templateUrl: 'customer-search.component.html',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatButtonModule,
    MatTableModule,
    MatDividerModule,
    MatPaginatorModule,
    CommonModule,
    FaIconComponent,
    TafelAutofocusDirective,
    FormatCustomerAddressPipe
  ]
})
export class CustomerSearchComponent {
  private readonly customerApiService = inject(CustomerApiService);
  private readonly router = inject(Router);
  private readonly toastr = inject(TafelToastrService);
  private readonly fb = inject(FormBuilder);

  form = this.fb.group({
    customerId: this.fb.control<number | null>(null),
    lastname: this.fb.control<string | null>(null),
    firstname: this.fb.control<string | null>(null),
    postProcessing: this.fb.control<boolean | null>(null),
    costContribution: this.fb.control<boolean | null>(null),
    valid: this.fb.control<boolean | null>(null),
  });

  // Use signals so the template-sugar (@if / @for) reacts immediately when updated
  searchResult = signal<CustomerSearchResult | undefined>(undefined);

  searchForCustomerId() {
    const customerId = this.customerId.value!;

    /* eslint-disable @typescript-eslint/no-unused-vars */
    const observer = {
      next: (response: CustomerData) => this.navigateToCustomerDetail(customerId),
      error: (error: any) => {
        if (error.status === 404) {
          this.toastr.info('Kunde nicht gefunden!');
        } else {
          this.toastr.error('Fehler beim Laden des Kunden!');
        }
      }
    };
    this.customerApiService.getCustomer(customerId, SUPPRESS_ERROR_TOAST_CONTEXT).subscribe(observer);
  }

  private navigateToCustomerDetail(customerId: number) {
    return this.router.navigate(['/kunden/detail', customerId]);
  }

  searchForDetails(page?: number, pageSize?: number) {
    this.customerApiService.searchCustomer(
      this.lastname.value ?? undefined,
      this.firstname.value ?? undefined,
      this.postProcessing.value ?? undefined,
      this.costContribution.value ?? undefined,
      this.valid.value ?? undefined,
      page,
      pageSize)
      .subscribe((response: CustomerSearchResult) => {
        if (response.items.length === 0) {
          this.toastr.info('Keine Kunden gefunden!');
          this.searchResult.set(undefined);
        } else {
          this.searchResult.set(response);
        }
      });
  }

  navigateToCustomer(customerId: number) {
    this.navigateToCustomerDetail(customerId);
  }

  editCustomer(customerId: number) {
    this.router.navigate(['/kunden/bearbeiten', customerId]);
  }

  trackByCustomerId(index: number, customer: any): number {
    return customer.id;
  }

  // columns for mat-table
  displayedColumns = ['icon', 'id', 'name', 'birthDate', 'address', 'personsCount', 'issuedAt', 'validUntil', 'actions'];

  get customerId() {
    return this.form.get('customerId')!;
  }

  get lastname() {
    return this.form.get('lastname')!;
  }

  get firstname() {
    return this.form.get('firstname')!;
  }

  get postProcessing() {
    return this.form.get('postProcessing')!;
  }

  get costContribution() {
    return this.form.get('costContribution')!;
  }

  get valid() {
    return this.form.get('valid')!;
  }

  protected readonly faPencil = faPencil;
  protected readonly faUser = faUser;
  protected readonly faSearch = faSearch;
  protected readonly pageSizeOptions = PAGE_SIZE_OPTIONS;
}
