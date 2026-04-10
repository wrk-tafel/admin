import {Component, computed, inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {DistributionCloseValidationResult} from '../../../../../api/distribution-api.service';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';
import {MatButton} from "@angular/material/button";

export interface CloseDistributionValidationDialogData {
  validationResult: DistributionCloseValidationResult;
}

@Component({
  selector: 'tafel-close-distribution-validation-dialog',
  imports: [TafelDialogComponent, MatDialogModule, MatButton],
  templateUrl: 'close-distribution-validation-dialog.component.html'
})
export class CloseDistributionValidationDialogComponent {
  readonly dialogRef = inject(MatDialogRef<CloseDistributionValidationDialogComponent>);
  readonly data: CloseDistributionValidationDialogData = inject(MAT_DIALOG_DATA);

  protected readonly dialogType = computed<'danger' | 'warning' | 'info'>(() => {
    if (this.data.validationResult.errors.length > 0) {
      return 'danger';
    } else if (this.data.validationResult.warnings.length > 0) {
      return 'warning';
    }
    return 'info';
  });

  protected readonly dialogTitle = computed(() => {
    if (this.data.validationResult.errors.length > 0) {
      return 'Fehler';
    } else if (this.data.validationResult.warnings.length > 0) {
      return 'Hinweis';
    }
    return '';
  });
}
