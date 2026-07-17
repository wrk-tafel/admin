import {Component, inject} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';

@Component({
  selector: 'tafel-delete-customer-dialog',
  imports: [TafelDialogComponent, MatButtonModule],
  templateUrl: 'delete-customer-dialog.component.html',
})
export class DeleteCustomerDialogComponent {
  readonly dialogRef = inject(MatDialogRef<DeleteCustomerDialogComponent>);
}
