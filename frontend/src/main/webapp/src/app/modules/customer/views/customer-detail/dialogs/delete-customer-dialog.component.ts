import {Component, inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';

export interface DeleteCustomerDialogData {
  customerName: string;
  /** Set when the customer currently holds an unprocessed ticket in the active distribution. */
  ticketNumber?: number | null;
}

@Component({
  selector: 'tafel-delete-customer-dialog',
  imports: [TafelDialogComponent, MatButtonModule],
  templateUrl: 'delete-customer-dialog.component.html',
})
export class DeleteCustomerDialogComponent {
  readonly dialogRef = inject(MatDialogRef<DeleteCustomerDialogComponent>);
  readonly data: DeleteCustomerDialogData = inject(MAT_DIALOG_DATA);
}
