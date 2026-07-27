import {Component, inject, input} from '@angular/core';
import {Router} from '@angular/router';
import {CustomerAboveLimitItem} from '../../../../api/customer-api.service';
import {MatCardModule} from '@angular/material/card';
import {MatButtonModule} from '@angular/material/button';
import {MatTableModule} from '@angular/material/table';
import {CommonModule} from '@angular/common';
import {faSearch, faUser} from '@fortawesome/free-solid-svg-icons';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {FormatCustomerAddressPipe} from '../../../../common/pipes/format-customer-address.pipe';

@Component({
  selector: 'tafel-customer-above-limit',
  templateUrl: 'customer-above-limit.component.html',
  imports: [
    MatCardModule,
    MatButtonModule,
    MatTableModule,
    CommonModule,
    FaIconComponent,
    FormatCustomerAddressPipe
  ]
})
export class CustomerAboveLimitComponent {
  // Signal input from resolver - name matches the route's resolve key exactly (see customer.routes.ts)
  readonly customerAboveLimitData = input<CustomerAboveLimitItem[]>([]);

  private readonly router = inject(Router);

  showCustomerDetail(customerId: number) {
    this.router.navigate(['/kunden/detail', customerId]);
  }

  trackByCustomerId(index: number, item: CustomerAboveLimitItem): number {
    return item.customer.id!;
  }

  // columns for mat-table
  displayedColumns = ['icon', 'id', 'name', 'address', 'validUntil', 'totalSum', 'limit', 'amountExceededLimit', 'actions'];

  protected readonly faUser = faUser;
  protected readonly faSearch = faSearch;
}
