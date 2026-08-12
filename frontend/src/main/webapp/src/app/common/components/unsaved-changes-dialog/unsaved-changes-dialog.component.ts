import {Component, inject} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {TafelDialogComponent} from '../tafel-dialog/tafel-dialog.component';

/**
 * Asked before a screen with unsaved changes is left. Closes with `true` when the changes may be
 * discarded - see `unsavedChangesGuard`.
 */
@Component({
  selector: 'tafel-unsaved-changes-dialog',
  imports: [TafelDialogComponent, MatButtonModule],
  templateUrl: 'unsaved-changes-dialog.component.html'
})
export class UnsavedChangesDialogComponent {
  readonly dialogRef = inject(MatDialogRef<UnsavedChangesDialogComponent, boolean>);
}
