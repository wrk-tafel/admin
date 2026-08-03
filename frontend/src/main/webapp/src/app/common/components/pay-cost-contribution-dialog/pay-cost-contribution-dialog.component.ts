import {Component, inject, signal} from '@angular/core';
import {CurrencyPipe} from '@angular/common';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {FormsModule} from '@angular/forms';
import {TafelDialogComponent} from '../tafel-dialog/tafel-dialog.component';

export interface PayCostContributionDialogData {
  pendingAmount: number;
}

@Component({
  selector: 'tafel-pay-cost-contribution-dialog',
  imports: [TafelDialogComponent, MatButtonModule, MatFormFieldModule, MatInputModule, FormsModule, CurrencyPipe],
  templateUrl: 'pay-cost-contribution-dialog.component.html',
})
export class PayCostContributionDialogComponent {
  readonly dialogRef = inject(MatDialogRef<PayCostContributionDialogComponent>);
  readonly data: PayCostContributionDialogData = inject(MAT_DIALOG_DATA);
  amountInput = signal<number | null>(null);
}
