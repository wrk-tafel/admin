import {Component, computed, inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {CurrencyPipe, NgClass} from '@angular/common';
import {ValidateCustomerResponse} from '../../../../../api/customer-api.service';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';

export interface ValidationResultDialogData {
  validationResult: ValidateCustomerResponse;
}

@Component({
  selector: 'tafel-validation-result-dialog',
  imports: [TafelDialogComponent, MatDialogModule, MatButtonModule, CurrencyPipe, NgClass],
  templateUrl: 'validation-result-dialog.component.html',
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

  protected readonly details = computed(() => this.data.validationResult.details);

  protected readonly baseLimitLabel = computed<string>(() => {
    const countAdults = this.details().baseLimitCountAdults;
    const countChildren = this.details().baseLimitCountChildren;
    const children = countChildren === 1 ? '1 Kind' : `${countChildren} Kinder`;

    return countChildren > 0
      ? `Grundbetrag (${countAdults} Erw., ${children})`
      : `Grundbetrag (${countAdults} Erw.)`;
  });

  protected readonly additionalAdultsLabel = computed<string>(() => {
    const count = this.details().additionalAdultsCount;
    return count === 1 ? '1 weiterer Erwachsener' : `${count} weitere Erwachsene`;
  });

  protected readonly additionalChildrenLabel = computed<string>(() => {
    const count = this.details().additionalChildrenCount;
    return count === 1 ? '1 weiteres Kind' : `${count} weitere Kinder`;
  });
}
