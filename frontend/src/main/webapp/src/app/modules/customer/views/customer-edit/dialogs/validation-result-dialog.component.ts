import {Component, computed, inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {ButtonDirective} from '@coreui/angular';
import {DecimalPipe, NgClass} from '@angular/common';
import {ValidateCustomerResponse} from '../../../../../api/customer-api.service';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';

export interface ValidationResultDialogData {
  validationResult: ValidateCustomerResponse;
}

@Component({
  selector: 'tafel-validation-result-dialog',
  imports: [TafelDialogComponent, MatDialogModule, ButtonDirective, DecimalPipe, NgClass],
  templateUrl: './validation-result-dialog.component.html',
})
export class ValidationResultDialogComponent {
  readonly dialogRef = inject(MatDialogRef<ValidationResultDialogComponent>);
  readonly data: ValidationResultDialogData = inject(MAT_DIALOG_DATA);

  protected readonly dialogType = computed<'danger' | 'success'>(() =>
    this.data.validationResult.valid ? 'success' : 'danger'
  );
  protected readonly dialogTitle = computed<string>(() =>
    this.data.validationResult.valid ? 'Anspruch vorhanden' : 'Kein Anspruch vorhanden'
  );
}
