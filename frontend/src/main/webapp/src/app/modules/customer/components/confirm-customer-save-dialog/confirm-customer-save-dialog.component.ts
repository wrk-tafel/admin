import {Component, inject, input} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {ButtonDirective} from '@coreui/angular';
import {TafelDialogComponent} from '../../../../common/components/tafel-dialog/tafel-dialog.component';

export interface ConfirmCustomerSaveDialogData {
  message: string;
}

@Component({
  selector: 'tafel-confirm-customer-save-dialog',
  imports: [TafelDialogComponent, ButtonDirective],
  templateUrl: 'confirm-customer-save-dialog.component.html',
})
export class ConfirmCustomerSaveDialog {
  readonly dialogRef = inject(MatDialogRef<ConfirmCustomerSaveDialog>);
  readonly data: ConfirmCustomerSaveDialogData = inject(MAT_DIALOG_DATA);
}
