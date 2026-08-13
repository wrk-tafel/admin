import {Component, inject} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {TafelDialogComponent} from '../tafel-dialog/tafel-dialog.component';

/**
 * Confirms leaving a form with unsaved changes. Opened by `unsavedChangesGuard`
 * (`common/guards/unsaved-changes.guard.ts`) rather than by a screen directly.
 */
@Component({
  selector: 'tafel-unsaved-changes-dialog',
  imports: [TafelDialogComponent, MatButtonModule],
  templateUrl: 'unsaved-changes-dialog.component.html',
})
export class UnsavedChangesDialogComponent {
  readonly dialogRef = inject(MatDialogRef<UnsavedChangesDialogComponent>);
}
