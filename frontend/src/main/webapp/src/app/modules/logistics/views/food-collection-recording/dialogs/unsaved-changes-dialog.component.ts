import {Component, inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';

export interface UnsavedChangesDialogData {
  message: string;
  confirmLabel: string;
}

// Defaults match the original page-leave confirmation (opened by canDeactivate without data).
const DEFAULT_DATA: UnsavedChangesDialogData = {
  message: 'Es gibt ungespeicherte Änderungen auf dieser Seite. Beim Verlassen gehen sie verloren.',
  confirmLabel: 'Seite verlassen',
};

@Component({
  selector: 'tafel-unsaved-changes-dialog',
  imports: [TafelDialogComponent, MatButtonModule],
  templateUrl: 'unsaved-changes-dialog.component.html',
})
export class UnsavedChangesDialogComponent {
  readonly dialogRef = inject(MatDialogRef<UnsavedChangesDialogComponent>);
  readonly data: UnsavedChangesDialogData = inject<UnsavedChangesDialogData>(MAT_DIALOG_DATA, {optional: true}) ?? DEFAULT_DATA;
}
