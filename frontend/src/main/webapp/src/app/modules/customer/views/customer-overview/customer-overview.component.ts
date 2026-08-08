import {Component, inject, input, linkedSignal} from '@angular/core';
import {Router} from '@angular/router';
import {CustomerApiService, CustomerOverviewItem, CustomerOverviewResponse} from '../../../../api/customer-api.service';
import {DistributionItem, DistributionListResponse} from '../../../../api/distribution-api.service';
import {MatCardModule} from '@angular/material/card';
import {MatButtonModule} from '@angular/material/button';
import {MatTableModule} from '@angular/material/table';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatSelectModule} from '@angular/material/select';
import {MatTooltipModule} from '@angular/material/tooltip';
import {FormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {faRotate, faSearch, faUserPlus} from '@fortawesome/free-solid-svg-icons';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {FormatCustomerAddressPipe} from '../../../../common/pipes/format-customer-address.pipe';

@Component({
  selector: 'tafel-customer-overview',
  templateUrl: 'customer-overview.component.html',
  imports: [
    MatCardModule,
    MatButtonModule,
    MatTableModule,
    MatFormFieldModule,
    MatSelectModule,
    FormsModule,
    CommonModule,
    FaIconComponent,
    FormatCustomerAddressPipe,
    MatTooltipModule
  ]
})
export class CustomerOverviewComponent {
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

  private readonly customerApiService = inject(CustomerApiService);
  private readonly router = inject(Router);

  onDistributionSelected(distributionId: number | undefined) {
    this.selectedDistributionId.set(distributionId);
    this.customerApiService.getCustomersOverview(distributionId)
      .subscribe((response: CustomerOverviewResponse) => this.customerOverviewData.set(response));
  }

  showCustomerDetail(customerId: number) {
    this.router.navigate(['/kunden/detail', customerId]);
  }

  trackByCustomerId(index: number, item: CustomerOverviewItem): number {
    return item.customer.id!;
  }

  trackByDistributionId(index: number, item: DistributionItem): number {
    return item.id;
  }

  displayedColumns = ['icon', 'id', 'name', 'address', 'date', 'actions'];

  protected readonly faUserPlus = faUserPlus;
  protected readonly faRotate = faRotate;
  protected readonly faSearch = faSearch;
}
