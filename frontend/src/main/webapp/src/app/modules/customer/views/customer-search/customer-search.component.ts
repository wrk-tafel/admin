import {Component, inject} from '@angular/core';
import {Router} from '@angular/router';
import {CustomerAddressData, CustomerApiService, CustomerSearchResult} from '../../../../api/customer-api.service';
import {FormBuilder, ReactiveFormsModule} from '@angular/forms';
import {ToastService, ToastType} from '../../../../common/views/default-layout/toasts/toast.service';
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
        TafelAutofocusDirective
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
  });

  searchResult: CustomerSearchResult;
  paginationData: TafelPaginationData;

  searchForCustomerId() {
    const customerId = this.customerId.value;

    /* eslint-disable @typescript-eslint/no-unused-vars */
    const observer = {
      next: (response) => this.navigateToCustomerDetail(customerId)
    };
    this.customerApiService.getCustomer(customerId).subscribe(observer);
  }

  private navigateToCustomerDetail(customerId: number) {
    return this.router.navigate(['/kunden/detail', customerId]);
  }

  searchForDetails(page?: number) {
    this.customerApiService.searchCustomer(this.lastname.value, this.firstname.value, this.postProcessing.value, page)
      .subscribe((response: CustomerSearchResult) => {
        if (response.items.length === 0) {
          this.toastService.showToast({type: ToastType.INFO, title: 'Keine Kunden gefunden!'});
          this.searchResult = null;
          this.paginationData = null;
        } else {
          this.searchResult = response;
          this.paginationData = {
            count: response.items.length,
            totalCount: response.totalCount,
            currentPage: response.currentPage,
            totalPages: response.totalPages,
            pageSize: response.pageSize
          };
        }
      });
  }

  navigateToCustomer(customerId: number) {
    this.navigateToCustomerDetail(customerId)
  }

  editCustomer(customerId: number) {
    this.router.navigate(['/kunden/bearbeiten', customerId]);
  }

  formatAddress(address: CustomerAddressData): string {
    const formatted = [
      [address.street, address.houseNumber].join(' ').trim(),
      address.stairway ? 'Stiege ' + address.stairway : undefined,
      address.door ? 'Top ' + address.door : undefined,
      [address.postalCode, address.city].join(' ').trim()
    ]
      .filter(value => value?.trim().length > 0)
      .join(', ');
    return formatted?.trim().length > 0 ? formatted : '-';
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

  protected readonly faPencil = faPencil;
  protected readonly faUser = faUser;
  protected readonly faSearch = faSearch;
}
