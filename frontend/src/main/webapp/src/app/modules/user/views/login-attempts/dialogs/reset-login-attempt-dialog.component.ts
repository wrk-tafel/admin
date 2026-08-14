import {Component, inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';

export interface ResetLoginAttemptDialogData {
  username: string;
}

/**
 * Asked before the failure counter of an entry that is *not* locked is thrown away - there nothing
 * is waiting on it, so the deletion is housekeeping rather than the point. Lifting an actual lock
 * skips this dialog.
 */
@Component({
  selector: 'tafel-reset-login-attempt-dialog',
  imports: [TafelDialogComponent, MatButtonModule],
  templateUrl: 'reset-login-attempt-dialog.component.html',
})
export class ResetLoginAttemptDialogComponent {
  readonly dialogRef = inject(MatDialogRef<ResetLoginAttemptDialogComponent>);
  protected readonly data = inject<ResetLoginAttemptDialogData>(MAT_DIALOG_DATA);
}
