import {Component, inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';

export interface WithdrawConsentDialogData {
  customerName: string;
  /** Set when the customer currently holds an unprocessed ticket in the active distribution. */
  ticketNumber?: number | null;
}

@Component({
  selector: 'tafel-withdraw-consent-dialog',
  imports: [TafelDialogComponent, MatButtonModule],
  templateUrl: 'withdraw-consent-dialog.component.html',
})
export class WithdrawConsentDialogComponent {
  readonly dialogRef = inject(MatDialogRef<WithdrawConsentDialogComponent>);
  readonly data: WithdrawConsentDialogData = inject(MAT_DIALOG_DATA);
}
