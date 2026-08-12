import {Component, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {map, Subject, switchMap} from 'rxjs';
import {Router, RouterLink} from '@angular/router';
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
import {MatTooltipModule} from '@angular/material/tooltip';
import {CommonModule} from '@angular/common';
import {faPencil, faSearch, faUser} from '@fortawesome/free-solid-svg-icons';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {TafelAutofocusDirective} from '../../../../common/directive/tafel-autofocus.directive';
import {FormatCustomerAddressPipe} from '../../../../common/pipes/format-customer-address.pipe';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {SUPPRESS_ERROR_TOAST_CONTEXT} from '../../../../common/http/suppress-error-toast.token';
import {PAGE_SIZE_OPTIONS} from '../../../../common/api/paged-response';
import {TafelInfoTooltipComponent} from '../../../../common/components/tafel-info-tooltip/tafel-info-tooltip.component';

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
    FormatCustomerAddressPipe,
    MatTooltipModule,
    TafelInfoTooltipComponent,
    RouterLink
  ]
})
export class CustomerSearchComponent {
  private readonly customerApiService = inject(CustomerApiService);
  private readonly router = inject(Router);
  private readonly toastr = inject(TafelToastrService);
  private readonly fb = inject(FormBuilder);

  form = this.fb.group({
    customerId: this.fb.control<number | null>(null),
    searchInput: this.fb.control<string | null>(null),
    postProcessing: this.fb.control<boolean | null>(null),
    costContribution: this.fb.control<boolean | null>(null),
    valid: this.fb.control<boolean | null>(null),
  });

  // Use signals so the template-sugar (@if / @for) reacts immediately when updated
  searchResult = signal<CustomerSearchResult | undefined>(undefined);

  // What the role="status" region in the template says. A search replaces the whole result table,
  // or clears it again, and neither is a change a screen reader notices on its own. It is its own
  // signal rather than derived from searchResult(), because the empty result clears that signal.
  searchAnnouncement = signal('');

  /**
   * Every search goes through this subject instead of subscribing per call, so that a newer search
   * cancels the one still in flight. Without it the answers race and the last one to *arrive* wins:
   * the unfiltered list this screen loads on arrival is the slowest query it has, so a search
   * started while it is still on its way would be silently replaced by everything again.
   */
  private readonly searches = new Subject<CustomerSearchRequest>();

  constructor() {
    this.searches
      .pipe(
        switchMap(request => this.customerApiService.searchCustomer(
          this.searchInput.value ?? undefined,
          this.postProcessing.value ?? undefined,
          this.costContribution.value ?? undefined,
          this.valid.value ?? undefined,
          request.page,
          request.pageSize,
        ).pipe(map(response => ({response: response, announceOutcome: request.announceOutcome})))),
        takeUntilDestroyed(),
      )
      .subscribe(result => this.applySearchResult(result.response, result.announceOutcome));

    // Land on the first page of customers rather than an empty form. The unfiltered list is what
    // most visits are after anyway, and showing it makes the screen explain itself instead of
    // leaving the impression that there is nothing here until something is typed.
    this.searchForDetails(undefined, undefined, false);
  }

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

  /**
   * @param announceOutcome off for the initial load only. Both the toast and the status region are
   * answers to a search: greeting someone with "Keine Kunden gefunden!" before they have searched
   * for anything reads like a failure rather than an empty database, and announcing a result count
   * to a screen reader on arrival is noise about something nobody asked for.
   */
  searchForDetails(page?: number, pageSize?: number, announceOutcome = true) {
    this.searches.next({page: page, pageSize: pageSize, announceOutcome: announceOutcome});
  }

  private applySearchResult(response: CustomerSearchResult, announceOutcome: boolean) {
    if (response.items.length === 0) {
      this.searchResult.set(undefined);
      if (announceOutcome) {
        this.toastr.info('Keine Kunden gefunden!');
        this.searchAnnouncement.set('Keine Kunden gefunden');
      }
    } else {
      this.searchResult.set(response);
      if (announceOutcome) {
        this.searchAnnouncement.set(
          response.totalCount === 1 ? '1 Kunde gefunden' : `${response.totalCount} Kunden gefunden`
        );
      }
    }
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

  get searchInput() {
    return this.form.get('searchInput')!;
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

/** One queued search - the filters themselves are read off the form when the request is sent. */
interface CustomerSearchRequest {
  page?: number;
  pageSize?: number;
  announceOutcome: boolean;
}
