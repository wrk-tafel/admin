import {Component, computed, inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {ButtonDirective} from '@coreui/angular';
import {DistributionCloseValidationResult} from '../../../../../api/distribution-api.service';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';

export interface CloseDistributionValidationDialogData {
  validationResult: DistributionCloseValidationResult;
}

@Component({
  selector: 'tafel-close-distribution-validation-dialog',
  imports: [TafelDialogComponent, MatDialogModule, ButtonDirective],
  template: `
    <tafel-dialog [type]="dialogType()" [title]="dialogTitle()">
      <div tafel-dialog-content>
        @for (error of data.validationResult.errors; track error) {
          <div class="mb-2">{{ error }}</div>
        }
        @for (warning of data.validationResult.warnings; track warning) {
          <div class="mb-2">{{ warning }}</div>
        }
      </div>
      <div tafel-dialog-actions>
        @if (data.validationResult.warnings.length > 0) {
          <button testid="distribution-close-validation-dialog-ok-button" cButton
                  (click)="dialogRef.close('force')">Trotzdem beenden
          </button>
        }
        <button testid="distribution-close-validation-dialog-cancel-button" cButton color="secondary"
                (click)="dialogRef.close()">Abbrechen
        </button>
      </div>
    </tafel-dialog>
  `,
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
