import {Component, inject} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';
import {ButtonDirective} from '@coreui/angular';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';

@Component({
  selector: 'tafel-delete-customer-dialog',
  imports: [TafelDialogComponent, ButtonDirective],
  templateUrl: './delete-customer-dialog.component.html',
})
export class DeleteCustomerDialogComponent {
  readonly dialogRef = inject(MatDialogRef<DeleteCustomerDialogComponent>);
}
