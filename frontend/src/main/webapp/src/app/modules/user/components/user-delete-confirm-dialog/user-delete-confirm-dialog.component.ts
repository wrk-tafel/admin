import {Component, inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {TafelDialogComponent} from '../../../../common/components/tafel-dialog/tafel-dialog.component';

export interface UserDeleteConfirmDialogData {
  username: string;
  /** "Firstname Lastname" as shown to the admin - the username alone does not say whose account it is. */
  name: string;
}

/**
 * A user account is deleted permanently, not disabled - so this asks before it happens. Shared by
 * the user search (per-row trash button) and the user detail ("Benutzer löschen"), which is why it
 * sits in `components/` rather than under either view.
 */
@Component({
  selector: 'tafel-user-delete-confirm-dialog',
  imports: [TafelDialogComponent, MatButtonModule],
  templateUrl: 'user-delete-confirm-dialog.component.html'
})
export class UserDeleteConfirmDialogComponent {
  readonly dialogRef = inject(MatDialogRef<UserDeleteConfirmDialogComponent>);
  readonly data: UserDeleteConfirmDialogData = inject(MAT_DIALOG_DATA);
}
