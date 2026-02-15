import {Component, inject, signal} from '@angular/core';
import {Router} from '@angular/router';
import {CustomerApiService, CustomerSearchResult} from '../../../../api/customer-api.service';
import {FormBuilder, ReactiveFormsModule} from '@angular/forms';
import {ToastService, ToastType} from '../../../../common/components/toasts/toast.service';
import {
  TafelPaginationComponent,
  TafelPaginationData
} from '../../../../common/components/tafel-pagination/tafel-pagination.component';
import {
  ButtonDirective,
  CardBodyComponent,
  CardComponent,
  CardFooterComponent,
  CardHeaderComponent,
  ColComponent,
  FormCheckInputDirective,
  FormDirective,
  InputGroupComponent,
  RowComponent,
  TableDirective
} from '@coreui/angular';
import {CommonModule} from '@angular/common';
import {faPencil, faSearch, faUser} from '@fortawesome/free-solid-svg-icons';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {TafelAutofocusDirective} from '../../../../common/directive/tafel-autofocus.directive';
import {FormatAddressPipe} from '../../../../common/pipes/format-address.pipe';

@Component({
    selector: 'tafel-customer-search',
    templateUrl: 'customer-search.component.html',
    imports: [
        ReactiveFormsModule,
        CardComponent,
        CardBodyComponent,
        RowComponent,
        ColComponent,
        InputGroupComponent,
        TafelPaginationComponent,
        CardHeaderComponent,
        CardFooterComponent,
        FormDirective,
        FormCheckInputDirective,
        TableDirective,
        ButtonDirective,
        CommonModule,
        FaIconComponent,
        TafelAutofocusDirective,
        FormatAddressPipe
    ]
})
export class CustomerSearchComponent {
  private readonly customerApiService = inject(CustomerApiService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  form = this.fb.group({
    customerId: this.fb.control<number>(null),
    lastname: this.fb.control<string>(null),
    firstname: this.fb.control<string>(null),
    postProcessing: this.fb.control<boolean>(null),
    costContribution: this.fb.control<boolean>(null),
  });

  // Use signals so the template-sugar (@if / @for) reacts immediately when updated
  searchResult = signal<CustomerSearchResult | undefined>(undefined);
  paginationData = signal<TafelPaginationData | undefined>(undefined);

  searchForCustomerId() {
    const customerId = this.customerId.value;

    /* eslint-disable @typescript-eslint/no-unused-vars */
    const observer = {
      next: (response) => this.navigateToCustomerDetail(customerId),
      error: (error) => {
        if (error.status === 404) {
          this.toastService.showToast({type: ToastType.INFO, title: 'Kunde nicht gefunden!'});
        } else {
          this.toastService.showToast({type: ToastType.ERROR, title: 'Fehler beim Laden des Kunden!'});
        }
      }
    };
    this.customerApiService.getCustomer(customerId).subscribe(observer);
  }

  private navigateToCustomerDetail(customerId: number) {
    return this.router.navigate(['/kunden/detail', customerId]);
  }

  searchForDetails(page?: number) {
    this.customerApiService.searchCustomer(this.lastname.value, this.firstname.value, this.postProcessing.value, this.costContribution.value, page)
      .subscribe((response: CustomerSearchResult) => {
        if (response.items.length === 0) {
          this.toastService.showToast({type: ToastType.INFO, title: 'Keine Kunden gefunden!'});
          this.searchResult.set(undefined);
          this.paginationData.set(undefined);
        } else {
          this.searchResult.set(response);
          this.paginationData.set({
            count: response.items.length,
            totalCount: response.totalCount,
            currentPage: response.currentPage,
            totalPages: response.totalPages,
            pageSize: response.pageSize
          });
        }
      });
  }

  navigateToCustomer(customerId: number) {
    this.navigateToCustomerDetail(customerId)
  }

  editCustomer(customerId: number) {
    this.router.navigate(['/kunden/bearbeiten', customerId]);
  }

  trackByCustomerId(index: number, customer: any): number {
    return customer.id;
  }

  get customerId() {
    return this.form.get('customerId');
  }

  get lastname() {
    return this.form.get('lastname');
  }

  get firstname() {
    return this.form.get('firstname');
  }

  get postProcessing() {
    return this.form.get('postProcessing');
  }

  get costContribution() {
    return this.form.get('costContribution');
  }

  protected readonly faPencil = faPencil;
  protected readonly faUser = faUser;
  protected readonly faSearch = faSearch;
}
