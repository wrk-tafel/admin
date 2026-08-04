import {Component, inject, signal} from '@angular/core';
import {CurrencyPipe} from '@angular/common';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {FormsModule} from '@angular/forms';
import {TafelDialogComponent} from '../tafel-dialog/tafel-dialog.component';

export interface EditCostContributionDialogData {
  pendingAmount: number;
}

@Component({
  selector: 'tafel-edit-cost-contribution-dialog',
  imports: [TafelDialogComponent, MatButtonModule, MatFormFieldModule, MatInputModule, FormsModule, CurrencyPipe],
  templateUrl: 'edit-cost-contribution-dialog.component.html',
})
export class EditCostContributionDialogComponent {
  readonly dialogRef = inject(MatDialogRef<EditCostContributionDialogComponent>);
  readonly data: EditCostContributionDialogData = inject(MAT_DIALOG_DATA);
  amountInput = signal<number | null>(this.data.pendingAmount ?? 0);
}
